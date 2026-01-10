# Technical Diagrams Guide for AIREA Utility Innovation Application

## Required Visual Documentation for MyIPO Submission

### 1. System Architecture Diagram
**Purpose:** Show overall system structure and component relationships

**Components to Include:**
```
[User Interface Layer]
├── React.js Frontend (Property Search Interface)
├── Mobile-Responsive Design
└── Agent Portal Dashboard

[AI Processing Layer] 
├── Natural Language Processing Engine (OpenAI GPT-4o)
├── Query Translation Algorithm
└── Malaysian Property Terminology Parser

[Business Logic Layer]
├── Property Search Engine
├── Distance Calculation Service
├── User Management System
└── Agent Management System

[Data Layer]
├── PostgreSQL Database
├── Property Listings Storage
├── User Profiles & Preferences
└── Malaysian Location Database

[External Services]
├── OpenRouteService API (Traffic Data)
├── OpenStreetMap (Mapping Data)
└── Replit Authentication (OIDC)
```

### 2. AI Search Flow Diagram
**Purpose:** Demonstrate the natural language processing innovation

**Flow Steps:**
```
User Input: "2 bedroom condo near KLCC under RM500k"
    ↓
[Natural Language Processing]
    ↓
[Malaysian Property Parser]
- Bedrooms: 2
- Property Type: Condominium  
- Location: KLCC area
- Price Range: < RM500,000
    ↓
[Database Query Generation]
    ↓
[Property Matching Algorithm]
    ↓
[Results with Distance Calculation]
    ↓
User Interface Display
```

### 3. Distance Calculation Innovation Diagram
**Purpose:** Show traffic-aware distance calculation system

**Process Flow:**
```
Property Location Coordinates
    ↓
[User's Preferred Location Input]
    ↓
[OpenRouteService API Call]
- Malaysian Traffic Data
- Real-time Conditions
- Route Optimization
    ↓
[Travel Time Calculation]
- Peak Hours: 45 minutes
- Off-peak: 25 minutes
- Distance: 12.5 km
    ↓
[Display in Search Results]
```

### 4. Agent Portal Workflow Diagram
**Purpose:** Illustrate multi-step listing creation process

**Steps:**
```
Agent Login → Property Type Selection → Location Details → 
Unit Specifications → Pricing → Legal Details → 
Photo Upload → Description → Review → Submit
```

### 5. Database Schema Diagram
**Purpose:** Show data structure and relationships

**Key Tables:**
- Users (authentication, preferences)
- Properties (listings, details, coordinates)
- Agents (profiles, properties managed)  
- Messages (user-agent communication)
- Favorites (saved properties)
- Malaysian_Locations (comprehensive location database)

## Screenshot Requirements

### 1. Landing Page Screenshot
- Clean, minimalist design
- AI search prominence
- Malaysian property market focus

### 2. Search Results Page Screenshot  
- Property listings with distance calculations
- Map integration with property markers
- Filter options (property type, price, location)

### 3. Agent Portal Screenshots
- Multi-step listing creation flow
- Property type selection (Residential/Commercial/Industrial)
- Location input with Malaysian address validation

### 4. Mobile Interface Screenshots
- Responsive design demonstration
- Touch-optimized search interface
- Mobile property browsing experience

## Algorithm Flowcharts

### 1. Natural Language Processing Algorithm
**Input:** User query in natural language
**Processing:** 
- Tokenization and parsing
- Malaysian property term recognition
- Parameter extraction (price, location, type, features)
- Query validation and enhancement
**Output:** Structured database query

### 2. Malaysian Location Intelligence Algorithm  
**Input:** Location string (e.g., "near KLCC", "Petaling Jaya")
**Processing:**
- Malaysian location database lookup
- Coordinate resolution
- Nearby area identification
- Radius calculation for search area
**Output:** Geographic coordinates and search radius

### 3. Property Matching Algorithm
**Input:** User preferences and available properties
**Processing:**
- Exact match filtering
- Proximity scoring
- Price range matching  
- Feature compatibility scoring
- Final ranking algorithm
**Output:** Ranked list of matching properties

## Visual Design Requirements

### Color Scheme
- Primary: Professional blues and grays
- Accent: Malaysian-inspired colors (red/blue from flag)
- Background: Clean white/light gray
- Text: High contrast black/dark gray

### Typography
- Headers: Bold, professional fonts
- Body: Clean, readable sans-serif
- Code/Technical: Monospace fonts
- Emphasis: Strategic use of color and weight

### Layout Guidelines
- Clean, minimal design following user preferences
- Generous white space
- Logical information hierarchy
- Mobile-first responsive approach

## File Format Requirements for MyIPO

### Accepted Formats
- **Diagrams:** PDF, JPEG, PNG (high resolution)
- **Screenshots:** PNG recommended (actual interface captures)
- **Technical Drawings:** Vector formats preferred (SVG, PDF)
- **File Size:** Maximum 10MB per file
- **Resolution:** Minimum 300 DPI for print quality

### Naming Convention
- `01_system_architecture_diagram.pdf`
- `02_ai_search_flow_diagram.pdf`  
- `03_distance_calculation_diagram.pdf`
- `04_agent_portal_workflow.pdf`
- `05_database_schema_diagram.pdf`
- `06_landing_page_screenshot.png`
- `07_search_results_screenshot.png`
- `08_agent_portal_screenshot.png`
- `09_mobile_interface_screenshot.png`

## Creation Tools Recommendations

### Diagram Creation
- **Lucidchart:** Professional flowcharts and system diagrams
- **Draw.io (diagrams.net):** Free, web-based diagram tool
- **Microsoft Visio:** Comprehensive diagramming software
- **Figma:** UI/UX design and system architecture

### Screenshot Capture
- **Full Page Screenshots:** Browser developer tools
- **Mobile Screenshots:** Device emulation in browser
- **High Quality:** Use actual deployment URLs
- **Annotations:** Add callouts for key features

### Document Preparation
- **Adobe Acrobat:** PDF creation and optimization
- **Microsoft Office:** Document compilation and formatting
- **Google Workspace:** Collaborative editing and sharing

## Quality Assurance Checklist

### Technical Accuracy
- ✅ All components accurately represented
- ✅ Flow directions clearly indicated
- ✅ Malaysian-specific elements highlighted
- ✅ Innovation aspects clearly distinguished

### Visual Quality  
- ✅ High resolution and print-ready
- ✅ Professional appearance
- ✅ Consistent styling and branding
- ✅ Clear, readable text and labels

### MyIPO Compliance
- ✅ Required file formats
- ✅ Proper naming conventions
- ✅ File size within limits
- ✅ Complete documentation set

## Timeline for Preparation

### Week 1: Planning and Design
- Review system architecture
- Plan diagram layouts
- Gather existing screenshots
- Design visual style guide

### Week 2: Creation and Documentation
- Create all technical diagrams
- Capture high-quality screenshots
- Prepare flowcharts and algorithms
- Review and refine all materials

### Week 3: Finalization
- Quality assurance review
- File format conversion
- Final document compilation
- Submission preparation

This comprehensive guide ensures all visual documentation meets MyIPO requirements while effectively communicating your innovation's technical merits and commercial utility.