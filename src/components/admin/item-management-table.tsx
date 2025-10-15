'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '@/lib/animations'
import { AnimatedCard } from '@/components/ui/animated-card'
import { AnimatedButton } from '@/components/ui/animated-button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  Hash,
  Eye,
  Archive,
  QrCode
} from 'lucide-react'
import { ItemStatus, ItemCondition } from '@prisma/client'
import ItemFormModal, { ItemFormData } from './item-form-modal'
import Image from 'next/image'
import ItemStatisticsCards from './item-statistics-cards'

// Extended types for the management interface
interface ExtendedItem {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
  condition: ItemCondition
  status: ItemStatus
  location: string | null
  serialNumber: string | null
  qrCode: string | null
  barcode: string | null
  images: string[]
  value: number | null
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  _count: {
    reservations: number
  }
}

interface ItemManagementTableProps {
  className?: string
}

// Utility functions for status and condition styling
const getStatusBadgeVariant = (status: ItemStatus) => {
  switch (status) {
    case 'AVAILABLE':
      return 'default'
    case 'RESERVED':
      return 'secondary'
    case 'BORROWED':
      return 'outline'
    case 'MAINTENANCE':
      return 'destructive'
    case 'RETIRED':
      return 'outline'
    default:
      return 'outline'
  }
}

const getStatusIcon = (status: ItemStatus) => {
  switch (status) {
    case 'AVAILABLE':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'RESERVED':
      return <Calendar className="h-4 w-4 text-yellow-500" />
    case 'BORROWED':
      return <Package className="h-4 w-4 text-blue-500" />
    case 'MAINTENANCE':
      return <Settings className="h-4 w-4 text-orange-500" />
    case 'RETIRED':
      return <Archive className="h-4 w-4 text-gray-500" />
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-500" />
  }
}

const getConditionColor = (condition: ItemCondition): string => {
  switch (condition) {
    case 'EXCELLENT':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
    case 'GOOD':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
    case 'FAIR':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300'
    case 'POOR':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300'
    case 'DAMAGED':
      return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
    default:
      return 'bg-muted text-muted-foreground border-muted'
  }
}

export default function ItemManagementTable({ className }: ItemManagementTableProps) {
  const [items, setItems] = useState<ExtendedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')
  const [conditionFilter, setConditionFilter] = useState<ItemCondition | 'all'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'createdAt' | 'status' | 'condition'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalItems, setTotalItems] = useState(0)
  
  // Modal states
  const [selectedItem, setSelectedItem] = useState<ExtendedItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  
  // Bulk operations
  const [processingBulk, setProcessingBulk] = useState(false)
  
  // Available categories and filters
  const [categories, setCategories] = useState<string[]>([])

  // Fetch items data
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(conditionFilter !== 'all' && { condition: conditionFilter }),
      })
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/items?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch items')
      }
      
      const data = await response.json()
      setItems(data.items)
      setTotalItems(data.totalCount)
      
      // Extract unique categories for filter
      const uniqueCategories = [...new Set(data.items.map((item: ExtendedItem) => item.category))] as string[]
      setCategories(uniqueCategories)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, sortBy, sortOrder, searchQuery, categoryFilter, statusFilter, conditionFilter])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Handle individual item actions
  const handleEditItem = (item: ExtendedItem) => {
    setSelectedItem(item)
    setIsEditModalOpen(true)
  }

  const handleDeleteItem = (item: ExtendedItem) => {
    setSelectedItem(item)
    setIsDeleteModalOpen(true)
  }

  const handleViewDetails = (item: ExtendedItem) => {
    setSelectedItem(item)
    setIsDetailModalOpen(true)
  }

  // Handle bulk operations
  const handleBulkAction = async (action: 'delete' | 'status-change' | 'category-change', value?: string) => {
    if (selectedItems.length === 0) return

    try {
      setProcessingBulk(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/items/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemIds: selectedItems,
          action,
          value,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} items`)
      }

      await fetchItems()
      setSelectedItems([])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} items`)
    } finally {
      setProcessingBulk(false)
    }
  }

  // Handle single item deletion
  const confirmDeleteItem = async () => {
    if (!selectedItem) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/items/${selectedItem.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete item')
      }

      await fetchItems()
      setIsDeleteModalOpen(false)
      setSelectedItem(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    }
  }

  // Handle item save (add/edit)
  const handleSaveItem = async (itemData: ItemFormData) => {
    try {
      const url = selectedItem ? `/api/items/${selectedItem.id}` : '/api/items'
      const method = selectedItem ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${selectedItem ? 'update' : 'create'} item`)
      }

      await fetchItems()
      setIsAddModalOpen(false)
      setIsEditModalOpen(false)
      setSelectedItem(null)
      
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : `Failed to ${selectedItem ? 'update' : 'create'} item`)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <AnimatedCard className="p-8 bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center text-destructive"
          >
            <div className="p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Items</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <AnimatedButton onClick={fetchItems} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </AnimatedButton>
          </motion.div>
        </AnimatedCard>
      </div>
    )
  }

  return (
    <>
    <ItemStatisticsCards items={items} />
    <motion.div 
      className={`space-y-6 mt-6 ${className}`}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <AnimatedCard className="bg-gradient-to-br from-background to-muted/30 backdrop-blur-sm border border-border/50 shadow-lg">
        {/* Enhanced Header */}
        <motion.div variants={fadeInUp} className="p-6 border-b border-border/50">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Item Management
                </h2>
                <p className="text-muted-foreground">
                  Manage inventory items and track their status
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <AnimatedButton onClick={fetchItems} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </AnimatedButton>
              <AnimatedButton onClick={() => setIsAddModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </AnimatedButton>
            </div>
          </div>


          {/* Search and Filters */}
          <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between mt-6">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-4">
              {/* Search Input */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ItemStatus | 'all')}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="all">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="RESERVED">Reserved</option>
                <option value="BORROWED">Borrowed</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </select>

              {/* Condition Filter */}
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value as ItemCondition | 'all')}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="all">All Conditions</option>
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
                <option value="DAMAGED">Damaged</option>
              </select>

              {/* Sort Options */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'createdAt' | 'status' | 'condition')}
                  className="border border-border rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                >
                  <option value="name">Name</option>
                  <option value="createdAt">Created Date</option>
                  <option value="status">Status</option>
                  <option value="condition">Condition</option>
                </select>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </AnimatedButton>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-3 p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20"
              >
                <Badge className="bg-primary text-primary-foreground">
                  {selectedItems.length} selected
                </Badge>
                <div className="flex items-center space-x-2">
                  <AnimatedButton
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('status-change', 'AVAILABLE')}
                    disabled={processingBulk}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Available
                  </AnimatedButton>
                  <AnimatedButton
                    size="sm"
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                    disabled={processingBulk}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </AnimatedButton>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Enhanced Responsive Table */}
        <motion.div variants={fadeInUp} className="overflow-hidden">
          {loading ? (
            /* Table Loading State */
            <div className="space-y-4">
              {/* Desktop Loading Skeleton */}
              <div className="hidden lg:block">
                <div className="bg-muted/30 backdrop-blur-sm h-12 rounded-t-lg animate-pulse" />
                <div className="space-y-3 p-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted/20 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
              
              {/* Mobile Loading Skeleton */}
              <div className="lg:hidden space-y-4 p-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card rounded-xl shadow-lg border border-border/50 overflow-hidden">
                    <div className="p-4 border-b border-border/30 bg-muted/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted/50 rounded-lg animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted/50 rounded w-3/4 animate-pulse" />
                          <div className="h-3 bg-muted/30 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-muted/30 rounded animate-pulse" />
                      <div className="flex gap-2">
                        <div className="h-6 bg-muted/30 rounded w-16 animate-pulse" />
                        <div className="h-6 bg-muted/30 rounded w-12 animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-8 bg-muted/20 rounded animate-pulse" />
                        <div className="h-8 bg-muted/20 rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-4 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === items.length && items.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(items.map(item => item.id))
                        } else {
                          setSelectedItems([])
                        }
                      }}
                      className="rounded border-border focus:ring-primary/20 focus:ring-2"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Item Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Category & Tags
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status & Condition
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Location & Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item, index) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-muted/20 transition-colors duration-200 cursor-pointer"
                    onClick={() => handleViewDetails(item)}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id])
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id))
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border focus:ring-primary/20 focus:ring-2"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        {item.images.length > 0 ? (
                          <Image 
                            src={item.images[0]} 
                            alt={item.name}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-lg object-cover border border-border/50"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center border border-border/50">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {item.description || 'No description'}
                          </p>
                          {item.serialNumber && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Hash className="h-3 w-3" />
                              {item.serialNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <Badge variant="outline" className="font-medium">
                          {item.category}
                        </Badge>
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{item.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`${getConditionColor(item.condition)} text-xs`}
                        >
                          {item.condition}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        {item.location && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {item.location}
                          </p>
                        )}
                        {item.value && (
                          <p className="text-muted-foreground">
                            ${item.value.toLocaleString()}
                          </p>
                        )}
                        {(item.qrCode || item.barcode) && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <QrCode className="h-3 w-3" />
                            Coded
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {item._count.reservations} reservations
                        </p>
                        <p className="text-muted-foreground">
                          Created {formatDate(item.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDetails(item)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </AnimatedButton>
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditItem(item)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </AnimatedButton>
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteItem(item)
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AnimatedButton>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 p-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card rounded-xl shadow-lg border border-border/50 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-200"
                onClick={() => handleViewDetails(item)}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border/30 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item.id])
                          } else {
                            setSelectedItems(selectedItems.filter(id => id !== item.id))
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-border focus:ring-primary/20 focus:ring-2"
                      />
                      {item.images.length > 0 ? (
                        <Image 
                          src={item.images[0]} 
                          alt={item.name}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-lg object-cover border border-border/50"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center border border-border/50">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className={`${getConditionColor(item.condition)} text-xs`}
                    >
                      {item.condition}
                    </Badge>
                    {item.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Reservations</p>
                      <p className="font-medium">{item._count.reservations}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>

                  {item.location && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="p-4 border-t border-border/30 bg-muted/5">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <AnimatedButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetails(item)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </AnimatedButton>
                      <AnimatedButton
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditItem(item)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </AnimatedButton>
                    </div>
                    <AnimatedButton
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteItem(item)
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </AnimatedButton>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
            </>
          )}
        </motion.div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <motion.div variants={fadeInUp} className="px-6 py-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
              </div>
              <div className="flex items-center space-x-2">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </AnimatedButton>
                <span className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </AnimatedButton>
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <motion.div 
            variants={fadeInUp}
            className="text-center py-16"
          >
            <div className="p-4 bg-muted/20 rounded-full w-fit mx-auto mb-4">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || conditionFilter !== 'all'
                ? 'No items match your current filters.' 
                : 'No items have been created yet.'
              }
            </p>
            <div className="flex items-center justify-center gap-3">
              {(searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || conditionFilter !== 'all') && (
                <AnimatedButton 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('')
                    setCategoryFilter('all')
                    setStatusFilter('all')
                    setConditionFilter('all')
                  }}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Clear Filters
                </AnimatedButton>
              )}
              <AnimatedButton onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </AnimatedButton>
            </div>
          </motion.div>
        )}
      </AnimatedCard>

      {/* Item Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold mb-2">
              Item Details
            </DialogTitle>
            <DialogDescription>
              Complete information about the selected item
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Name</label>
                      <p className="font-semibold">{selectedItem.name}</p>
                    </div>
                    {selectedItem.description && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Description</label>
                        <p>{selectedItem.description}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Category</label>
                      <p>{selectedItem.category}</p>
                    </div>
                    {selectedItem.tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tags</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedItem.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
                    Status & Condition
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(selectedItem.status)}
                        <Badge variant={getStatusBadgeVariant(selectedItem.status)}>
                          {selectedItem.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Condition</label>
                      <div className="mt-1">
                        <Badge 
                          variant="outline" 
                          className={getConditionColor(selectedItem.condition)}
                        >
                          {selectedItem.condition}
                        </Badge>
                      </div>
                    </div>
                    {selectedItem.location && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Location</label>
                        <p className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedItem.location}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
                  Technical Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedItem.serialNumber && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                      <p className="font-mono text-sm">{selectedItem.serialNumber}</p>
                    </div>
                  )}
                  {selectedItem.qrCode && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">QR Code</label>
                      <p className="font-mono text-sm">{selectedItem.qrCode}</p>
                    </div>
                  )}
                  {selectedItem.barcode && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Barcode</label>
                      <Image 
                        src={selectedItem.barcode}
                        alt={`${selectedItem.name} Barcode`}
                        width={100}
                        height={100}
                        className="w-full h-32 rounded-lg object-cover border border-border/50"
                      />
                    </div>
                  )}
                  {selectedItem.value && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Value</label>
                      <p className="font-semibold">${selectedItem.value.toLocaleString()}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reservations</label>
                    <p className="font-semibold">{selectedItem._count.reservations}</p>
                  </div>
                </div>
              </div>

              {/* Images */}
              {selectedItem.images.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-border/50 pb-2">
                    Images
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedItem.images.map((image, index) => (
                      <Image 
                        key={index}
                        src={image} 
                        alt={`${selectedItem.name} ${index + 1}`}
                        width={300}
                        height={128}
                        className="w-full h-32 rounded-lg object-cover border border-border/50"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/50">
                <AnimatedButton 
                  onClick={() => setIsDetailModalOpen(false)}
                  variant="outline"
                  className="flex-1 sm:flex-initial"
                >
                  Close
                </AnimatedButton>
                <AnimatedButton 
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleEditItem(selectedItem)
                  }}
                  className="flex-1 sm:flex-initial"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Item
                </AnimatedButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                <p className="font-semibold">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">{selectedItem.category}</p>
                {selectedItem._count.reservations > 0 && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ This item has {selectedItem._count.reservations} reservation(s)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <AnimatedButton 
                  onClick={() => setIsDeleteModalOpen(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton 
                  onClick={confirmDeleteItem}
                  variant="destructive"
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Item
                </AnimatedButton>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Form Modal for Add */}
      <ItemFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveItem}
        mode="add"
      />

      {/* Item Form Modal for Edit */}
      <ItemFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveItem}
        item={selectedItem}
        mode="edit"
      />
    </motion.div>
    </>
  )
}