'use client'

import { useState, useCallback } from 'react'

interface UsePaginationOptions {
  defaultPageSize?: number
}

interface PaginationState {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export function usePagination({ defaultPageSize = 25 }: UsePaginationOptions = {}) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: defaultPageSize,
    totalItems: 0,
    totalPages: 0,
  })

  const setPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination(prev => ({ ...prev, page: 1, pageSize }))
  }, [])

  const updateFromResponse = useCallback((response: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }) => {
    setPagination(response)
  }, [])

  const resetPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const buildQueryParams = useCallback(() => {
    return `page=${pagination.page}&pageSize=${pagination.pageSize}`
  }, [pagination.page, pagination.pageSize])

  return {
    ...pagination,
    setPage,
    setPageSize,
    updateFromResponse,
    resetPage,
    buildQueryParams,
  }
}
