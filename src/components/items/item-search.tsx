'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ItemCondition, ItemStatus } from '@prisma/client'

interface FilterOption {
  category: string
  count: number
}

interface TagOption {
  tag: string
  count: number
}

interface ItemSearchProps {
  categories: FilterOption[]
  tags: TagOption[]
  totalCount: number
}

export function ItemSearch({ categories, tags, totalCount }: ItemSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State for form inputs
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '')
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get('status') || '')
  const [selectedCondition, setSelectedCondition] = useState(searchParams.get('condition') || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  )
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt')
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc')

  // Update URL with current filters
  const updateFilters = () => {
    const params = new URLSearchParams()
    
    if (searchTerm) params.set('search', searchTerm)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedStatus) params.set('status', selectedStatus)
    if (selectedCondition) params.set('condition', selectedCondition)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    router.push(`/items?${params.toString()}`)
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedStatus('')
    setSelectedCondition('')
    setSelectedTags([])
    setSortBy('createdAt')
    setSortOrder('desc')
    router.push('/items')
  }

  // Handle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters()
  }

  // Update filters when sort changes
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (searchTerm) params.set('search', searchTerm)
    if (selectedCategory) params.set('category', selectedCategory)
    if (selectedStatus) params.set('status', selectedStatus)
    if (selectedCondition) params.set('condition', selectedCondition)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy)
    if (sortOrder !== 'desc') params.set('sortOrder', sortOrder)
    
    // Reset to page 1 when filters change
    params.set('page', '1')
    
    router.push(`/items?${params.toString()}`)
  }, [sortBy, sortOrder, searchTerm, selectedCategory, selectedStatus, selectedCondition, selectedTags, router])

  const hasActiveFilters = searchTerm || selectedCategory || selectedStatus || 
                          selectedCondition || selectedTags.length > 0

  return (
    <Card className="p-6 space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Search items by name, description, or serial number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="default">
            Search
          </Button>
          {hasActiveFilters && (
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="createdAt">Date Added</option>
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="updatedAt">Last Updated</option>
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </form>

      {/* Filters */}
      <div className="space-y-4">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={selectedCategory === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('')}
              >
                All ({totalCount})
              </Button>
              {categories.map(({ category, count }) => (
                <Button
                  key={category}
                  type="button"
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category === selectedCategory ? '' : category)}
                >
                  {category} ({count})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedStatus === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStatus('')}
            >
              All
            </Button>
            {Object.values(ItemStatus).map((status) => (
              <Button
                key={status}
                type="button"
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(status === selectedStatus ? '' : status)}
              >
                {status.toLowerCase().replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Condition Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Condition</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={selectedCondition === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCondition('')}
            >
              All
            </Button>
            {Object.values(ItemCondition).map((condition) => (
              <Button
                key={condition}
                type="button"
                variant={selectedCondition === condition ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCondition(condition === selectedCondition ? '' : condition)}
              >
                {condition.toLowerCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Tags Filter */}
        {tags.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {tags.slice(0, 10).map(({ tag, count }) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleTag(tag)}
                >
                  {tag} ({count})
                </Badge>
              ))}
              {tags.length > 10 && (
                <Badge variant="outline" className="text-gray-500">
                  +{tags.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {searchTerm && (
              <Badge variant="secondary">
                Search: &ldquo;{searchTerm}&rdquo;
              </Badge>
            )}
            {selectedCategory && (
              <Badge variant="secondary">
                Category: {selectedCategory}
              </Badge>
            )}
            {selectedStatus && (
              <Badge variant="secondary">
                Status: {selectedStatus.toLowerCase().replace('_', ' ')}
              </Badge>
            )}
            {selectedCondition && (
              <Badge variant="secondary">
                Condition: {selectedCondition.toLowerCase()}
              </Badge>
            )}
            {selectedTags.map(tag => (
              <Badge key={tag} variant="secondary">
                Tag: {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
