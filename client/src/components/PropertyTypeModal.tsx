import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, X, Home, Building, Factory, Filter } from "lucide-react"

interface PropertyTypeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTypes: string[]
  onApply: (types: string[]) => void
}

// Property categories with icons and types
const propertyCategories = {
  residential: {
    label: "Residential",
    icon: Home,
    types: [
      { value: "apartment", label: "Apartment" },
      { value: "condominium", label: "Condominium" },
      { value: "serviced_residence", label: "Serviced Residence" },
      { value: "studio", label: "Studio" },
      { value: "loft", label: "Loft" },
      { value: "flat", label: "Flat" },
      { value: "duplex", label: "Duplex" },
      { value: "penthouse", label: "Penthouse" },
      { value: "townhouse", label: "Townhouse" },
      { value: "semi_detached_house", label: "Semi-Detached House" },
      { value: "terrace_house", label: "Terrace House" },
      { value: "bungalow", label: "Bungalow" }
    ]
  },
  commercial: {
    label: "Commercial",
    icon: Building,
    types: [
      { value: "office", label: "Office" },
      { value: "retail", label: "Retail" },
      { value: "shop", label: "Shop" },
      { value: "shopping_mall", label: "Shopping Mall" },
      { value: "warehouse", label: "Warehouse" },
      { value: "factory", label: "Factory" },
      { value: "hotel", label: "Hotel" },
      { value: "restaurant", label: "Restaurant" }
    ]
  },
  industrial: {
    label: "Industrial",
    icon: Factory,
    types: [
      { value: "factory", label: "Factory" },
      { value: "warehouse", label: "Warehouse" },
      { value: "industrial_land", label: "Industrial Land" },
      { value: "manufacturing", label: "Manufacturing" },
      { value: "logistics", label: "Logistics" }
    ]
  }
}

export function PropertyTypeModal({ isOpen, selectedTypes, onClose, onApply }: PropertyTypeModalProps) {
  const [internalSelectedTypes, setInternalSelectedTypes] = useState<string[]>(selectedTypes)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("residential")

  // Get all property types for search
  const allTypes = Object.values(propertyCategories).flatMap(category => category.types)
  
  // Filter types based on search query
  const filteredTypes = allTypes.filter(type =>
    type.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const togglePropertyType = (value: string) => {
    setInternalSelectedTypes(prev => 
      prev.includes(value) 
        ? prev.filter(type => type !== value)
        : [...prev, value]
    )
  }

  const handleApply = () => {
    onApply(internalSelectedTypes)
    onClose()
  }

  const handleClose = () => {
    setInternalSelectedTypes(selectedTypes)
    setSearchQuery("")
    onClose()
  }

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInternalSelectedTypes(selectedTypes)
      setSearchQuery("")
      setActiveTab("residential")
      
      // Prevent background scrolling and ensure modal is above content
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${window.scrollY}px`
      document.body.style.width = '100%'
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
    
    return () => {
      // Cleanup on unmount
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
    }
  }, [isOpen, selectedTypes])

  if (!isOpen) {
    return null
  }

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose()
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '900px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Filter style={{ width: '20px', height: '20px', color: '#2563eb' }} />
            <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, color: '#111827' }}>
              Select Property Types
            </h2>
          </div>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0 
        }}>
          <div style={{ position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '16px',
              height: '16px',
              color: '#6b7280'
            }} />
            <input
              type="text"
              placeholder="Search property types..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px 12px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {searchQuery ? (
            /* Search Results */
            <div>
              <h4 style={{ fontWeight: '500', marginBottom: '16px', fontSize: '16px' }}>
                Search Results ({filteredTypes.length})
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '12px' 
              }}>
                {filteredTypes.map((type) => (
                  <div 
                    key={type.value} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: internalSelectedTypes.includes(type.value) ? '#eff6ff' : 'white',
                      borderColor: internalSelectedTypes.includes(type.value) ? '#3b82f6' : '#e5e7eb'
                    }}
                    onClick={() => togglePropertyType(type.value)}
                  >
                    <Checkbox
                      checked={internalSelectedTypes.includes(type.value)}
                      onChange={() => togglePropertyType(type.value)}
                    />
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Category Tabs */
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                {Object.entries(propertyCategories).map(([key, category]) => {
                  const Icon = category.icon
                  const selectedCount = category.types.filter(t => 
                    internalSelectedTypes.includes(t.value)
                  ).length
                  
                  return (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{category.label}</span>
                      {selectedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {Object.entries(propertyCategories).map(([categoryKey, category]) => (
                <TabsContent key={categoryKey} value={categoryKey}>
                  <div>
                    <h3 style={{ fontWeight: '500', marginBottom: '16px', fontSize: '16px' }}>
                      {category.label} Properties
                    </h3>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                      gap: '12px' 
                    }}>
                      {category.types.map((type) => (
                        <div
                          key={type.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            backgroundColor: internalSelectedTypes.includes(type.value) ? '#eff6ff' : 'white',
                            borderColor: internalSelectedTypes.includes(type.value) ? '#3b82f6' : '#e5e7eb',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => togglePropertyType(type.value)}
                        >
                          <Checkbox
                            checked={internalSelectedTypes.includes(type.value)}
                            onChange={() => togglePropertyType(type.value)}
                          />
                          <span style={{ fontSize: '14px', fontWeight: '500' }}>{type.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {internalSelectedTypes.length} property type{internalSelectedTypes.length !== 1 ? 's' : ''} selected
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleApply} 
                style={{ 
                  backgroundColor: '#2563eb', 
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}