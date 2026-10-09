import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(sellerId: string, dto: CreateProductDto): Promise<Product> {
    const now = new Date();
    const product = this.productRepository.create({
      id: uuidv4(),
      sellerId,
      title: dto.title,
      description: dto.description,
      price: dto.price,
      category: dto.category,
      images: dto.images || [],
      stock: dto.stock ?? 1,
      deliveryMethod: dto.deliveryMethod || 'manual',
      proofFiles: dto.proofFiles || [],
      status: 'pending',
      averageRating: 0,
      reviewCount: 0,
      soldCount: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });
    return this.productRepository.save(product);
  }

  async findAll(
    query: QueryProductDto,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const qb = this.productRepository.createQueryBuilder('product');

    // Hanya tampilkan produk yang aktif dan belum dihapus
    qb.where('product.isDeleted = :isDeleted', { isDeleted: false });
    qb.andWhere('product.status = :status', { status: 'active' });

    if (query.search) {
      qb.andWhere(
        '(LOWER(product.title) LIKE :search OR LOWER(product.description) LIKE :search)',
        {
          search: `%${query.search.toLowerCase()}%`,
        },
      );
    }

    if (query.category) {
      qb.andWhere('LOWER(product.category) = :category', {
        category: query.category.toLowerCase(),
      });
    }

    if (query.minPrice !== undefined) {
      qb.andWhere('product.price >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.minRating !== undefined) {
      qb.andWhere('product.averageRating >= :minRating', {
        minRating: query.minRating,
      });
    }

    if (query.sellerId) {
      qb.andWhere('product.sellerId = :sellerId', { sellerId: query.sellerId });
    }

    const sortBy = query.sortBy || 'newest';
    const sortOrder = (query.sortOrder || 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    switch (sortBy) {
      case 'newest':
        qb.orderBy('product.createdAt', sortOrder);
        break;
      case 'oldest':
        qb.orderBy('product.createdAt', sortOrder === 'DESC' ? 'ASC' : 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('product.price', 'DESC');
        break;
      case 'popular':
        qb.orderBy('product.soldCount', sortOrder);
        break;
      case 'rating':
        qb.orderBy('product.averageRating', sortOrder);
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    qb.leftJoinAndSelect('product.seller', 'seller');

    const [data, total] = await qb.take(limit).skip(skip).getManyAndCount();

    return { data: data.map(this.formatProduct), total, page, limit };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.seller', 'seller')
      .where('product.id = :id', { id })
      .andWhere('product.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }
    return this.formatProduct(product);
  }

  private formatProduct(product: Product): Product & {
    seller?: {
      id: string;
      name: string;
      photo: string;
      sellerApplicationStatus: string;
    };
  } {
    const result = { ...product } as any;
    if (product.seller) {
      result.seller = {
        id: product.seller.id,
        name: product.seller.name,
        photo: product.seller.photo,
        sellerApplicationStatus: product.seller.sellerApplicationStatus,
      };
    }
    return result;
  }

  async findBySeller(sellerId: string): Promise<Product[]> {
    return this.productRepository.find({
      where: { sellerId, isDeleted: false },
    });
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    Object.assign(product, dto);
    product.updatedAt = new Date();
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    product.isDeleted = true;
    product.updatedAt = new Date();
    await this.productRepository.save(product);
  }

  async getCategories(): Promise<string[]> {
    const rawCategories = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT product.category', 'category')
      .where('product.isDeleted = :isDeleted', { isDeleted: false })
      .getRawMany();

    return rawCategories.map((c) => c.category).sort();
  }

  async getAllProducts(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ data: Product[]; total: number; page: number; limit: number }> {
    const qb = this.productRepository.createQueryBuilder('product');
    qb.where('product.isDeleted = :isDeleted', { isDeleted: false });
    if (status) {
      qb.andWhere('product.status = :status', { status });
    }
    qb.orderBy('product.createdAt', 'DESC');
    const skip = (page - 1) * limit;
    const [data, total] = await qb.take(limit).skip(skip).getManyAndCount();
    return { data, total, page, limit };
  }

  async getPendingListings(): Promise<Product[]> {
    return this.productRepository.find({
      where: { status: 'pending', isDeleted: false },
    });
  }

  async reviewListing(
    id: string,
    status: 'active' | 'rejected',
    reason?: string,
  ): Promise<Product> {
    const product = await this.findById(id);
    product.status = status;
    if (reason) {
      product.rejectionReason = reason;
    }
    product.updatedAt = new Date();
    return this.productRepository.save(product);
  }

  async updateRating(_productId: string): Promise<void> {
    // Implementasi rating diatur di review.service
  }

  async incrementSold(id: string): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (product) {
      product.soldCount++;
      product.updatedAt = new Date();
      await this.productRepository.save(product);
    }
  }
}
