import { Resolver, Query, Args, Int, ResolveReference } from '@nestjs/graphql';
import { Product } from './product.entity';
import { ProductService } from './product.service';

@Resolver(() => Product)
export class ProductResolver {
  constructor(private productService: ProductService) {}

  @Query(() => [Product])
  async products(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
    @Args('category', { nullable: true }) category?: string,
    @Args('minPrice', { type: () => Number, nullable: true }) minPrice?: number,
    @Args('maxPrice', { type: () => Number, nullable: true }) maxPrice?: number,
    @Args('search', { nullable: true }) search?: string
  ): Promise<Product[]> {
    return this.productService.findAll({
      limit,
      offset,
      category,
      minPrice,
      maxPrice,
      search,
    });
  }

  @Query(() => Product, { nullable: true })
  async product(@Args('id') id: string): Promise<Product | null> {
    return this.productService.findById(id);
  }

  @ResolveReference()
  resolveReference(reference: { id: string }): Promise<Product | null> {
    return this.productService.findById(reference.id);
  }
}
