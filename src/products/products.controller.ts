import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { hasSufficientRole } from '../common/constants/roles';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: CreateProductDto,
  ) {
    if (!hasSufficientRole(user.role, 'seller')) {
      throw new ForbiddenException('Only sellers can create products');
    }
    const product = await this.productsService.create(user.userId, dto);
    return { success: true, data: product, message: 'Product created, pending review' };
  }

  @Get()
  async findAll(@Query() query: QueryProductDto) {
    const result = await this.productsService.findAll(query);
    return { success: true, data: result.data, total: result.total, page: result.page, limit: result.limit };
  }

  @Get('categories')
  async getCategories() {
    const categories = await this.productsService.getCategories();
    return { success: true, data: categories };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyProducts(@CurrentUser() user: { userId: string; role: string }) {
    if (!hasSufficientRole(user.role, 'seller')) {
      throw new ForbiddenException('Only sellers can access this');
    }
    const products = await this.productsService.findBySeller(user.userId);
    return { success: true, data: products };
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findById(
    @Param('id') id: string,
    @CurrentUser() user?: { userId: string; role: string },
  ) {
    const product = await this.productsService.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    const isOwnerOrAdmin =
      user && (product.sellerId === user.userId || hasSufficientRole(user.role, 'admin'));
    if (product.status !== 'active' && !isOwnerOrAdmin) {
      throw new NotFoundException('Product not found');
    }
    return { success: true, data: product };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const product = await this.productsService.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    if (product.sellerId !== user.userId && !hasSufficientRole(user.role, 'admin')) {
      throw new ForbiddenException('You can only edit your own products');
    }
    const updated = await this.productsService.update(id, dto);
    return { success: true, data: updated, message: 'Product updated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentUser() user: { userId: string; role: string },
    @Param('id') id: string,
  ) {
    const product = await this.productsService.findById(id);
    if (!product || product.isDeleted) {
      throw new NotFoundException('Product not found');
    }
    if (product.sellerId !== user.userId && !hasSufficientRole(user.role, 'admin')) {
      throw new ForbiddenException('You can only delete your own products');
    }
    await this.productsService.remove(id);
    return { success: true, message: 'Product removed' };
  }
}
