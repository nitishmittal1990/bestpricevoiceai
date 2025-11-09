# Supported Platforms and Product Categories

Complete reference for supported e-commerce platforms and product categories in the Voice Price Comparison Agent.

## Table of Contents

1. [Supported Platforms](#supported-platforms)
2. [Product Categories](#product-categories)
3. [Specification Requirements](#specification-requirements)
4. [Platform-Specific Notes](#platform-specific-notes)

## Supported Platforms

The Voice Price Comparison Agent searches across major Indian e-commerce platforms:

### General E-commerce

#### Flipkart
- **URL**: https://www.flipkart.com
- **Categories**: Electronics, Fashion, Home, Books, Groceries
- **Strengths**: Competitive pricing, wide product range, frequent sales
- **Search Priority**: High
- **Notes**: One of India's largest e-commerce platforms

#### Amazon India
- **URL**: https://www.amazon.in
- **Categories**: Electronics, Fashion, Home, Books, Groceries
- **Strengths**: Fast delivery, Prime benefits, extensive catalog
- **Search Priority**: High
- **Notes**: Global platform with strong India presence

#### Snapdeal
- **URL**: https://www.snapdeal.com
- **Categories**: Electronics, Fashion, Home, Sports
- **Strengths**: Budget-friendly options, regional reach
- **Search Priority**: Medium
- **Notes**: Good for value-conscious shoppers

#### Tata Cliq
- **URL**: https://www.tatacliq.com
- **Categories**: Electronics, Fashion, Luxury
- **Strengths**: Authentic products, Tata brand trust
- **Search Priority**: Medium
- **Notes**: Part of Tata Group

### Electronics Specialists

#### Croma
- **URL**: https://www.croma.com
- **Categories**: Electronics, Appliances
- **Strengths**: Physical stores, expert advice, after-sales service
- **Search Priority**: High (for electronics)
- **Notes**: Tata Group's electronics retail chain

#### Reliance Digital
- **URL**: https://www.reliancedigital.in
- **Categories**: Electronics, Appliances
- **Strengths**: Physical stores, extended warranties, demos
- **Search Priority**: High (for electronics)
- **Notes**: Part of Reliance Retail

#### Vijay Sales
- **URL**: https://www.vijaysales.com
- **Categories**: Electronics, Appliances
- **Strengths**: Competitive pricing, physical stores
- **Search Priority**: Medium (for electronics)
- **Notes**: Mumbai-based electronics retailer

### Fashion & Lifestyle

#### Myntra
- **URL**: https://www.myntra.com
- **Categories**: Fashion, Accessories, Beauty
- **Strengths**: Fashion-focused, exclusive brands, styling advice
- **Search Priority**: High (for fashion)
- **Notes**: Flipkart-owned fashion platform

### Quick Commerce (Future Support)

#### Blinkit
- **URL**: https://blinkit.com
- **Categories**: Groceries, Essentials
- **Notes**: 10-minute delivery, limited to groceries

#### Zepto
- **URL**: https://www.zepto.com
- **Categories**: Groceries, Essentials
- **Notes**: Quick delivery, limited to groceries

#### Instamart (Swiggy)
- **URL**: https://www.swiggy.com/instamart
- **Categories**: Groceries, Essentials
- **Notes**: Part of Swiggy, quick delivery

## Product Categories

### 1. Laptops

**Category Code**: `laptop`

**Required Specifications**:
- Brand (Apple, Dell, HP, Lenovo, Asus, Acer, MSI, etc.)
- Model (MacBook Pro, XPS, Pavilion, ThinkPad, etc.)
- Screen Size (13", 14", 15", 16", 17")
- Processor (Intel i5/i7/i9, AMD Ryzen 5/7/9, Apple M1/M2/M3)
- RAM (8GB, 16GB, 32GB, 64GB)
- Storage (256GB, 512GB, 1TB, 2TB SSD)

**Optional Specifications**:
- Graphics Card (Integrated, NVIDIA GTX/RTX, AMD Radeon)
- Color (Silver, Space Gray, Black, etc.)
- Operating System (Windows, macOS, Linux)

**Example Queries**:
- "MacBook Pro 14 inch with M3 Pro chip, 18GB RAM, and 512GB storage"
- "Dell XPS 13 with Intel i7, 16GB RAM, and 512GB SSD"
- "Lenovo ThinkPad with AMD Ryzen 7, 32GB RAM, and 1TB SSD"

### 2. Phones

**Category Code**: `phone`

**Required Specifications**:
- Brand (Apple, Samsung, OnePlus, Xiaomi, Vivo, Oppo, etc.)
- Model (iPhone 15, Galaxy S24, OnePlus 12, etc.)
- Storage Capacity (64GB, 128GB, 256GB, 512GB, 1TB)

**Optional Specifications**:
- Color (varies by model)
- RAM (for Android phones)
- Network (5G, 4G)

**Example Queries**:
- "iPhone 15 Pro 256GB in Natural Titanium"
- "Samsung Galaxy S24 Ultra 512GB in Titanium Black"
- "OnePlus 12 256GB in Flowy Emerald"

### 3. Tablets

**Category Code**: `tablet`

**Required Specifications**:
- Brand (Apple, Samsung, Lenovo, etc.)
- Model (iPad, iPad Air, iPad Pro, Galaxy Tab, etc.)
- Screen Size (8", 10", 11", 12.9", 13")
- Storage Capacity (64GB, 128GB, 256GB, 512GB, 1TB)
- Connectivity (Wi-Fi, Wi-Fi + Cellular)

**Optional Specifications**:
- Color (varies by model)
- Generation/Year

**Example Queries**:
- "iPad Air 11-inch 256GB Wi-Fi"
- "Samsung Galaxy Tab S9 128GB Wi-Fi + 5G"
- "iPad Pro 12.9-inch 512GB Wi-Fi + Cellular"

### 4. Headphones

**Category Code**: `headphones`

**Required Specifications**:
- Brand (Sony, Bose, Apple, JBL, Sennheiser, etc.)
- Model (WH-1000XM5, QuietComfort, AirPods, etc.)
- Type (Over-ear, On-ear, In-ear, Earbuds)
- Connectivity (Wired, Wireless, Bluetooth)

**Optional Specifications**:
- Color (Black, White, Silver, etc.)
- Noise Cancellation (Active, Passive, None)

**Example Queries**:
- "Sony WH-1000XM5 wireless headphones in black"
- "Apple AirPods Pro 2nd generation"
- "Bose QuietComfort 45 over-ear headphones"

### 5. Monitors

**Category Code**: `monitor`

**Required Specifications**:
- Brand (Dell, LG, Samsung, BenQ, Asus, etc.)
- Model
- Screen Size (24", 27", 32", 34", 49")
- Resolution (1080p, 1440p, 4K, 5K)

**Optional Specifications**:
- Refresh Rate (60Hz, 144Hz, 165Hz, 240Hz)
- Panel Type (IPS, VA, TN, OLED)
- Curved/Flat

**Example Queries**:
- "Dell UltraSharp 27-inch 4K monitor"
- "LG 34-inch ultrawide 1440p 144Hz"
- "Samsung Odyssey G7 32-inch curved gaming monitor"

### 6. Cameras

**Category Code**: `camera`

**Required Specifications**:
- Brand (Canon, Nikon, Sony, Fujifilm, etc.)
- Model (EOS R6, Z6 II, A7 IV, etc.)
- Type (DSLR, Mirrorless, Point-and-shoot)

**Optional Specifications**:
- Megapixels
- Lens Kit (Body only, Kit lens, Pro lens)
- Video Capability (4K, 8K)

**Example Queries**:
- "Canon EOS R6 Mark II mirrorless camera body only"
- "Sony A7 IV with 28-70mm kit lens"
- "Nikon Z6 II mirrorless camera"

### 7. Desktops

**Category Code**: `desktop`

**Required Specifications**:
- Brand (Apple, Dell, HP, Lenovo, Custom Build)
- Model (iMac, OptiPlex, Pavilion, etc.)
- Processor (Intel i5/i7/i9, AMD Ryzen 5/7/9, Apple M1/M2)
- RAM (8GB, 16GB, 32GB, 64GB)
- Storage (256GB, 512GB, 1TB, 2TB SSD)

**Optional Specifications**:
- Graphics Card
- Form Factor (Tower, Mini, All-in-one)

**Example Queries**:
- "iMac 24-inch with M3 chip, 16GB RAM, and 512GB storage"
- "Dell OptiPlex desktop with Intel i7, 32GB RAM, and 1TB SSD"

### 8. Smartwatches

**Category Code**: `smartwatch`

**Required Specifications**:
- Brand (Apple, Samsung, Garmin, Fitbit, etc.)
- Model (Apple Watch, Galaxy Watch, etc.)
- Size (40mm, 44mm, 45mm, etc.)

**Optional Specifications**:
- Connectivity (GPS, GPS + Cellular)
- Band Type (Sport, Leather, Metal)
- Color

**Example Queries**:
- "Apple Watch Series 9 45mm GPS + Cellular"
- "Samsung Galaxy Watch 6 Classic 47mm"
- "Garmin Fenix 7 multisport GPS watch"

## Specification Requirements

### Mandatory vs Optional

The agent uses a smart specification gathering system:

1. **Mandatory Specifications**: Required for accurate price comparison
   - Vary by product category
   - Agent will always ask for these
   - Search cannot proceed without them

2. **Optional Specifications**: Nice to have but not required
   - Agent may ask if relevant
   - Can be skipped if user doesn't care
   - Used to refine search if provided

### Category-Specific Requirements

| Category | Mandatory | Optional |
|----------|-----------|----------|
| Laptop | Brand, Model, Screen Size, Processor, RAM, Storage | Graphics, Color, OS |
| Phone | Brand, Model, Storage | Color, RAM, Network |
| Tablet | Brand, Model, Size, Storage, Connectivity | Color, Generation |
| Headphones | Brand, Model, Type, Connectivity | Color, Noise Cancellation |
| Monitor | Brand, Model, Size, Resolution | Refresh Rate, Panel Type |
| Camera | Brand, Model, Type | Megapixels, Lens Kit |
| Desktop | Brand, Model, Processor, RAM, Storage | Graphics, Form Factor |
| Smartwatch | Brand, Model, Size | Connectivity, Band, Color |

## Platform-Specific Notes

### Flipkart
- **Best For**: Electronics, fashion, general shopping
- **Pricing**: Competitive, frequent sales and offers
- **Delivery**: Fast in major cities, slower in remote areas
- **Returns**: 7-30 days depending on product
- **Payment**: COD, cards, UPI, EMI options

### Amazon India
- **Best For**: Wide product range, Prime benefits
- **Pricing**: Competitive, Prime Day deals
- **Delivery**: Fast with Prime, standard otherwise
- **Returns**: 10-30 days depending on product
- **Payment**: COD, cards, UPI, EMI, Amazon Pay

### Croma
- **Best For**: Electronics with in-store support
- **Pricing**: Competitive, price match guarantee
- **Delivery**: Standard, can pick up from store
- **Returns**: 7-15 days, easier with physical stores
- **Payment**: Cards, UPI, EMI, store credit

### Reliance Digital
- **Best For**: Electronics, appliances, demos
- **Pricing**: Competitive, bundle offers
- **Delivery**: Standard, store pickup available
- **Returns**: 7-15 days with physical stores
- **Payment**: Cards, UPI, EMI, Jio benefits

### Myntra
- **Best For**: Fashion, accessories, beauty
- **Pricing**: Fashion-focused pricing, seasonal sales
- **Delivery**: Fast for fashion items
- **Returns**: 30 days for fashion, easy returns
- **Payment**: COD, cards, UPI, Myntra credit

### Vijay Sales
- **Best For**: Electronics, competitive pricing
- **Pricing**: Often lower than competitors
- **Delivery**: Standard, store pickup
- **Returns**: 7-10 days
- **Payment**: Cards, UPI, EMI

### Tata Cliq
- **Best For**: Authentic products, luxury items
- **Pricing**: Premium positioning
- **Delivery**: Standard
- **Returns**: 15-30 days
- **Payment**: Cards, UPI, EMI, Tata Neu benefits

### Snapdeal
- **Best For**: Budget-friendly options
- **Pricing**: Lower price points
- **Delivery**: Varies by seller
- **Returns**: 7-15 days
- **Payment**: COD, cards, UPI

## Search Strategy

### Platform Priority

The agent prioritizes platforms based on product category:

**Electronics (Laptops, Phones, Tablets)**:
1. Flipkart
2. Amazon India
3. Croma
4. Reliance Digital
5. Vijay Sales
6. Tata Cliq
7. Snapdeal

**Fashion & Accessories**:
1. Myntra
2. Flipkart
3. Amazon India
4. Tata Cliq

**General Products**:
1. Flipkart
2. Amazon India
3. Snapdeal
4. Tata Cliq

### Specification Matching

The agent ensures exact specification matching:

1. **Strict Matching**: All mandatory specs must match exactly
2. **Fuzzy Matching**: Minor variations in product names allowed
3. **Validation**: LLM validates that specs match before including in results
4. **Confidence Score**: Each result gets a match confidence score (0-100%)
5. **Filtering**: Results below 80% confidence are excluded

### Price Comparison

Results are ranked by:

1. **Price** (primary): Lowest to highest
2. **Availability**: In-stock items prioritized
3. **Match Confidence**: Higher confidence ranked higher
4. **Platform Reliability**: Trusted platforms ranked higher

## Future Enhancements

### Planned Platform Additions

- **Paytm Mall**: General e-commerce
- **Shopclues**: Budget shopping
- **Ajio**: Fashion (Reliance)
- **Nykaa**: Beauty and fashion
- **FirstCry**: Baby products

### Planned Category Additions

- **Televisions**: Smart TVs, LED, OLED
- **Appliances**: Refrigerators, washing machines, ACs
- **Gaming Consoles**: PlayStation, Xbox, Nintendo
- **Smart Home**: Speakers, lights, security
- **Furniture**: Chairs, desks, beds
- **Books**: Physical and e-books
- **Groceries**: Packaged foods, essentials

### Enhanced Features

- **Price History**: Track price changes over time
- **Price Alerts**: Notify when price drops
- **Deal Alerts**: Notify about sales and offers
- **Comparison Charts**: Visual price comparisons
- **Review Integration**: Include product ratings
- **Warranty Comparison**: Compare warranty terms
- **EMI Options**: Show EMI plans across platforms
