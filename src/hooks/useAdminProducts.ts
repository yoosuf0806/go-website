import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchProducts,
  fetchCategories,
  fetchPackages,
  fetchProductPackageStock,
  setProductPackageStock,
  createProduct,
  updateProduct,
  deleteProduct,
  updateCategory,
  type ProductInput,
  type AdminCategory,
} from '../lib/adminProducts'

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin', 'products'],
    queryFn: fetchProducts,
    staleTime: 15_000,
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: fetchCategories,
    staleTime: 15_000,
  })
}

export function useProductMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'products'] })

  const create = useMutation({ mutationFn: (input: ProductInput) => createProduct(input), onSuccess: invalidate })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ProductInput> }) => updateProduct(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteProduct(id), onSuccess: invalidate })

  return { create, update, remove }
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<AdminCategory, 'is_visible'>> }) =>
      updateCategory(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'categories'] }),
  })
}

/** Active packages, for building the per-product-per-package stock grid (one column each). */
export function useAdminPackages() {
  return useQuery({
    queryKey: ['admin', 'packages'],
    queryFn: fetchPackages,
    staleTime: 60_000,
  })
}

/** All product_package_stock override rows. No row for a combo = in stock. */
export function useAdminProductPackageStock() {
  return useQuery({
    queryKey: ['admin', 'productPackageStock'],
    queryFn: fetchProductPackageStock,
    staleTime: 15_000,
  })
}

export function useSetProductPackageStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      packageId,
      inStock,
    }: {
      productId: string
      packageId: string
      inStock: boolean
    }) => setProductPackageStock(productId, packageId, inStock),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'productPackageStock'] }),
  })
}
