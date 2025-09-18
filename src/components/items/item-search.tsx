'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { AnimatedCard } from '@/components/ui/animated-card'
import { ItemCondition, ItemStatus } from '@prisma/client'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Search, Filter, X, SortAsc, SortDesc, ChevronDown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const [showFilters, setShowFilters] = useState(false)

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
    setShowFilters(false)
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

  // Auto-open filters if there are active filters
  useEffect(() => {
    if (hasActiveFilters && !showFilters) {
      setShowFilters(true)
    }
  }, [hasActiveFilters, showFilters])

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
    >
      <AnimatedCard className="p-8 space-y-8 bg-background/80 backdrop-blur-sm border-border/50 shadow-soft-shadow dark:shadow-dark-shadow">
        {/* Search Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Search Input */}
          <motion.div variants={fadeInUp} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name, description, or serial number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
              />
            </div>
            <AnimatedButton 
              type="submit" 
              variant="default"
              size="lg"
              className="h-12 px-8"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </AnimatedButton>
            <AnimatedButton 
              type="button" 
              variant="outline" 
              size="lg"
              onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-6 transition-all duration-200 relative ${showFilters ? 'bg-primary text-primary-foreground' : ''}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              <span>Filters</span>
              {hasActiveFilters && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full"
                >
                  {[searchTerm, selectedCategory, selectedStatus, selectedCondition, ...selectedTags].filter(Boolean).length}
                </Badge>
              )}
              <motion.div
                animate={{ rotate: showFilters ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </AnimatedButton>
            {hasActiveFilters && (
              <AnimatedButton 
                type="button" 
                variant="outline" 
                size="lg"
                onClick={clearFilters}
                className="h-12 px-6"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </AnimatedButton>
            )}
          </motion.div>

          {/* Collapsible Filters and Sort Controls */}
          <motion.div
            initial={false}
            animate={{
              height: showFilters ? "auto" : 0,
              opacity: showFilters ? 1 : 0
            }}
            transition={{
              duration: 0.3,
              ease: "easeInOut"
            }}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              animate={{
                y: showFilters ? 0 : -20
              }}
              transition={{
                duration: 0.3,
                ease: "easeInOut"
              }}
              className="space-y-6 pt-6"
            >
              {/* Sort Controls */}
              <motion.div variants={fadeInUp} className="flex gap-4 items-center bg-muted/30 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {sortOrder === 'desc' ? (
                    <SortDesc className="h-4 w-4" />
                  ) : (
                    <SortAsc className="h-4 w-4" />
                  )}
                  <span className="font-medium">Sort by:</span>
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Added</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="updatedAt">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-48 bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Filters */}
              <motion.div 
                className="space-y-8"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {/* Category Filter */}
                {categories.length > 0 && (
                  <motion.div variants={fadeInUp}>
                    <div className="flex items-center gap-2 mb-4">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-base font-semibold text-foreground">Categories</h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <AnimatedButton
                        variant={selectedCategory === '' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('')}
                        className="rounded-full"
                      >
                        All ({totalCount})
                      </AnimatedButton>
                      {categories.map(({ category, count }) => (
                        <AnimatedButton
                          key={category}
                          variant={selectedCategory === category ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSelectedCategory(category === selectedCategory ? '' : category)}
                          className="rounded-full capitalize"
                        >
                          {category} ({count})
                        </AnimatedButton>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Status Filter */}
                <motion.div variants={fadeInUp}>
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Status</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <AnimatedButton
                      variant={selectedStatus === '' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedStatus('')}
                      className="rounded-full"
                    >
                      All
                    </AnimatedButton>
                    {Object.values(ItemStatus).map((status) => (
                      <AnimatedButton
                        key={status}
                        variant={selectedStatus === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedStatus(status === selectedStatus ? '' : status)}
                        className="rounded-full capitalize"
                      >
                        {status.toLowerCase().replace('_', ' ')}
                      </AnimatedButton>
                    ))}
                  </div>
                </motion.div>

                {/* Condition Filter */}
                <motion.div variants={fadeInUp}>
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-base font-semibold text-foreground">Condition</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <AnimatedButton
                      variant={selectedCondition === '' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCondition('')}
                      className="rounded-full"
                    >
                      All
                    </AnimatedButton>
                    {Object.values(ItemCondition).map((condition) => (
                      <AnimatedButton
                        key={condition}
                        variant={selectedCondition === condition ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCondition(condition === selectedCondition ? '' : condition)}
                        className="rounded-full capitalize"
                      >
                        {condition.toLowerCase()}
                      </AnimatedButton>
                    ))}
                  </div>
                </motion.div>

                {/* Tags Filter */}
                {tags.length > 0 && (
                  <motion.div variants={fadeInUp}>
                    <div className="flex items-center gap-2 mb-4">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-base font-semibold text-foreground">Tags</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 12).map(({ tag, count }) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                          className="cursor-pointer hover:bg-primary/10 transition-colors duration-200 px-3 py-1.5 text-sm rounded-full"
                          onClick={() => toggleTag(tag)}
                        >
                          {tag} ({count})
                        </Badge>
                      ))}
                      {tags.length > 12 && (
                        <Badge variant="outline" className="text-muted-foreground rounded-full">
                          +{tags.length - 12} more
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Active Filters Summary */}
              {hasActiveFilters && (
                <motion.div 
                  variants={fadeInUp}
                  className="pt-6 border-t border-border/30"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-muted-foreground font-medium">Active filters:</span>
                    {searchTerm && (
                      <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
                        Search: &ldquo;{searchTerm}&rdquo;
                      </Badge>
                    )}
                    {selectedCategory && (
                      <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Category: {selectedCategory}
                      </Badge>
                    )}
                    {selectedStatus && (
                      <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Status: {selectedStatus.toLowerCase().replace('_', ' ')}
                      </Badge>
                    )}
                    {selectedCondition && (
                      <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        Condition: {selectedCondition.toLowerCase()}
                      </Badge>
                    )}
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        Tag: {tag}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </motion.form>
      </AnimatedCard>
    </motion.div>
  )
}
