# 📊 Phân Tích Toàn Diện Thuật Toán Lập Lịch Trình Du Lịch Thông Minh (HSTS)

> **Tài liệu này tổng hợp và phân tích chi tiết toàn bộ luồng xử lý, thuật toán, công thức tính toán, và tích hợp API từ 3 nguồn tài liệu gốc.**

---

## 📑 Mục Lục

1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Mô Hình Dữ Liệu (Entities)](#2-mô-hình-dữ-liệu-entities)
3. [Luồng Xử Lý Tổng Thể (Data Flow Pipeline)](#3-luồng-xử-lý-tổng-thể-data-flow-pipeline)
4. [Chi Tiết Tính Toán Quãng Đường và Khoảng Cách](#4-chi-tiết-tính-toán-quãng-đường-và-khoảng-cách)
5. [Thuật Toán Tham Lam (Greedy) Xác Định Location và Lộ Trình](#5-thuật-toán-tham-lam-greedy-xác-định-location-và-lộ-trình)
6. [Logic Kết Nối API Bên Ngoài - Phân Biệt Train, Plane, Bus](#6-logic-kết-nối-api-bên-ngoài-phân-biệt-train-plane-bus)
7. [Hệ Thống Chấm Điểm (Scoring System)](#7-hệ-thống-chấm-điểm-scoring-system)
8. [Quản Lý Ngân Sách (Budget Management)](#8-quản-lý-ngân-sách-budget-management)
9. [Xây Dựng Timeline Theo Ngày](#9-xây-dựng-timeline-theo-ngày)
10. [Tích Hợp Phương Tiện Di Chuyển](#10-tích-hợp-phương-tiện-di-chuyển)
11. [Các Giới Hạn và Lưu Ý](#11-các-giới-hạn-và-lưu-ý)

---

## 1. Tổng Quan Kiến Trúc Hệ Thống

### 1.1 Mục Tiêu Thuật Toán

Thuật toán được thiết kế để tạo **lịch trình du lịch thông minh** tối ưu dựa trên:
- ✅ **Ngân sách** người dùng cung cấp
- ✅ **Thời gian** (số ngày, ngày khởi hành, ngày về)
- ✅ **Sở thích** (tags yêu thích, loại địa điểm)
- ✅ **Nhóm khách** (group size, độ tuổi)
- ✅ **Điểm đến** (danh sách tỉnh/thành phố)

### 1.2 Nguyên Tắc Thiết Kế

| Nguyên Tắc | Mô Tả |
|------------|-------|
| **Static Filtering** | Lọc dữ liệu ở cấp độ database trước khi đưa vào memory |
| **Graceful Fallback** | Tự động chuyển phương án dự phòng khi API thất bại |
| **Multi-Factor Scoring** | Chấm điểm dựa trên nhiều chiều (chất lượng, thời gian, chi phí, khoảng cách) |
| **Greedy Optimization** | Sử dụng thuật toán tham lam để chọn lựa tối ưu cục bộ |
| **Budget Rollover** | Cuộn ngân sách dư sang ngày tiếp theo |
| **Anti-Duplicate** | Không gợi ý lại địa điểm đã thăm |

---

## 2. Mô Hình Dữ Liệu (Entities)

### 2.1 Danh Sách Entities Chính

```
┌─────────────────────────────────────────────────────────────────┐
│  CORE ENTITIES                                                  │
├─────────────────────────────────────────────────────────────────┤
│  1.  SocialLinks(SocialId, Platform, LocationId, Url  )                     │
│  2.  Tag (TagId, TagParentId, Title)                           │
│  3.  LocationMedia (MediaId, LocationId, Link)                 │
│  4.  OpeningHours (DayOfWeek 1-7, OpenTime, CloseTime)         │
│  5.  Districts (DistrictId, ProvinceId, Longitude, Latitude)   │
│  6.  TransportModes (Category enum, Name, Capacity)            │
│  7.  Countries                                                 │
│  8.  Amenities (AmenityId, Name, Description)                  │
│  9.  Provinces (ProvinceId, Code, Longitude, Latitude)         │
│  10. LocationTypes (LocationTypeId, TypeName)                  │
│  11. LocationAmenities (LocationId, AmenityId)                 │
│  12. TransitHubs (Code, Name, Longitude, Latitude)             │
│  13. LocalTransportMetrics (CostPerKm, SpeedKmh, MaxDistance)  │
│  14. LocationTags (LocationId, TagId)                          │
│  15. Locations (LocationName, PriceMin, PriceMax, Score,       │
│                  Longitude, Latitude, Source, SourceUrl)       │
│  16. TransitHubTypes                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Quan Trọng: Location Entity

```csharp
Location {
    LocationId,
    ProvinceId,
    DistrictId,
    LocationTypeId,
    LocationName,
    Description,
    
    // Giá theo đầu người (per person)
    PriceMin,        // VND per person
    PriceMax,        // VND per person
    
    // Điểm chất lượng dịch vụ (0-10 hoặc 0-5)
    Score,           // Service quality rating
    
    // Thông tin liên hệ
    Address,
    PhoneNumber,
    Email,
    
    // Thời lượng đề xuất
    RecommentDurationsMinutes,
    
    // Tọa độ địa lý
    Longitude,
    Latitude,
    
    // Nguồn dữ liệu
    Source,
    SourceUrl,
    
    // Relations
    Tags: List<Tag>,
    Medias: List<LocationMedia>,
    RoomTypes: List<RoomType>,      // Cho accommodation
    Amenities: List<Amenity>        // Qua LocationAmenities
}
```

### 2.3 TransportModes Category Enum

```csharp
enum TransportCategory {
   DynamicLocal,
   FixedIntercity      // Phương tiện nội thành
         // Phương tiện nội thành
}
```

---

## 3. Luồng Xử Lý Tổng Thể (Data Flow Pipeline)

### 3.1 Pipeline 7 Giai Đoạn

```
┌─────────────────────────────────────────────────────────────────┐
│                    INPUT (ItineraryRequest)    
    - ToProvinceId/DistrictId (điểm xuất phát)              │                 │
│  - GroupSize (số người: người lớn + trẻ em + trẻ sơ sinh)      │
│  - TotalBudget (tổng ngân sách VND)                            │
│  - StartDate, EndDate                                          │
│  - UserFavoriteTagIds (danh sách tag ID)                       │
│  - HotelPreference (Budget/Standard/Luxury)                    │
│  - TripSegment (Budget/Standard/Luxury)                        │
│  - FromProvinceId/DistrictId (điểm xuất phát)                  │
│  - UserGeo (tọa độ hiện tại, optional)                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 1: VALIDATION & DATA LOADING                        │
│  ✓ Validate province IDs tồn tại                               │
│  ✓ Validate date range (TotalDays = EndDate - StartDate + 1)  │
│  ✓ Load Provinces (build dictionary)                           │
│  ✓ Load Locations (include Tags, Media, RoomTypes, Amenities) │
│  ✓ Load TransportModes                                         │
│  ✓ Load TransitHubs                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 2: LOCATION SCORING & FILTERING                     │
│  ✓ Static Filtering (Score >= 0, MinTravelerAge)               │
│  ✓ Tag Matching (IsTagMatch trên Name + Description + Type)   │
│  ✓ Graceful Fallback (nếu tag filter ra 0 → bỏ tag filter)    │
│  ✓ Composite Scoring (Quality 40% + Time 35% + Cost 25%)      │
│  ✓ Phân tách: attractionsByProvince | hotelsByProvince         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 3: DESTINATION ROUTING                              │
│  ✓ OrderDestinationsByAttractionDensity (Greedy Nearest)       │
│  ✓ AllocateDaysToDestinations (Largest Remainder Method)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 4: BUDGET DECOMPOSITION                             │
│  ✓ Calculate Contingency Fund (5-20% tùy budget)               │
│  ✓ Estimate Inter-City Transport Budget                        │
│  ✓ Estimate Accommodation Budget                               │
│  ✓ Calculate Activity Budget (remaining)                       │
│  ✓ Daily Weight Distribution (1.3/1.1/1.2)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 5: INTER-CITY TRANSPORT ESTIMATION                  │
│  ✓ HeuristicInterCityRouteEstimator.EstimateAsync()            │
│  ✓ Tính distanceKm (Haversine)                                 │
│  ✓ SelectCategory (distance + groupSize)                       │
│  ✓ Gọi External API (Bus/Flight/Train)                         │
│  ✓ Fallback pricing nếu API thất bại                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 6: DAY-BY-DAY SCHEDULING                            │
│  ✓ BuildActivitiesForDay (Greedy Activity Picker)              │
│  ✓ BuildLocalTransportOptions                                  │
│  ✓ BuildAccommodationRecommendation                            │
│  ✓ Check Opening Hours (Day of Week 1-7)                       │
│  ✓ Weather Consideration (prioritizeIndoor)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GIAI ĐOẠN 7: OUTPUT ASSEMBLY                                  │
│  ✓ SmartItineraryDto                                           │
│  ✓ BudgetSummary                                               │
│  ✓ Days[] (DailyItineraryDto với Activities, TravelLegs)       │
│  ✓ InterCityTransportOptions[]                                 │
│  ✓ First-Mile Guidance (user location → first destination)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Chi Tiết Tính Toán Quãng Đường và Khoảng Cách

### 4.1 Haversine Formula - Khoảng Cách Đường Chim Bay

**Công dụng:** Tính khoảng cách địa lý giữa 2 điểm tọa độ (lat, lon)

```csharp
public static double CalculateHaversineDistance(
    double lat1, double lon1,
    double lat2, double lon2)
{
    const double EarthRadiusKm = 6371.0;
    
    // Chuyển đổi từ degrees sang radians
    double φ1 = lat1 * Math.PI / 180.0;
    double φ2 = lat2 * Math.PI / 180.0;
    double Δφ = (lat2 - lat1) * Math.PI / 180.0;
    double Δλ = (lon2 - lon1) * Math.PI / 180.0;
    
    // Haversine formula
    double a = Math.Sin(Δφ / 2) * Math.Sin(Δφ / 2) +
               Math.Cos(φ1) * Math.Cos(φ2) *
               Math.Sin(Δλ / 2) * Math.Sin(Δλ / 2);
    
    double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    
    double distance = EarthRadiusKm * c;
    
    return distance; // km
}
```

**Phân tích công thức:**

| Biến | Ý Nghĩa |
|------|---------|
| `φ1, φ2` | Vĩ độ (latitude) của điểm 1 và 2 (radians) |
| `Δφ` | Chênh lệch vĩ độ |
| `Δλ` | Chênh lệch kinh độ (longitude) |
| `a` | Bình phương của nửa khoảng cách góc |
| `c` | Khoảng cách góc (radians) |
| `distance` | Khoảng cách thực tế (km) |

**Ví dụ tính toán:**

```
Hà Nội: 21.0285° N, 105.8542° E
TP.HCM: 10.8231° N, 106.6297° E

φ1 = 21.0285 × π/180 = 0.3670 rad
φ2 = 10.8231 × π/180 = 0.1889 rad
Δφ = (10.8231 - 21.0285) × π/180 = -0.1781 rad
Δλ = (106.6297 - 105.8542) × π/180 = 0.0135 rad

a = sin²(-0.1781/2) + cos(0.3670) × cos(0.1889) × sin²(0.0135/2)
a = 0.0079 + 0.9336 × 0.9822 × 0.000045
a = 0.0079 + 0.000041 = 0.007941

c = 2 × atan2(√0.007941, √(1-0.007941))
c = 2 × atan2(0.0891, 0.9960)
c = 2 × 0.0893 = 0.1786 rad

distance = 6371 × 0.1786 ≈ 1138 km ✓
```

### 4.2 OSRM Routing API - Khoảng Cách Đường Bộ Thực Tế

**Khi nào dùng OSRM:**
- Khi cần khoảng cách **đường bộ thực tế** (không phải đường chim bay)
- Khi tính toán lộ trình di chuyển nội thành (local transport)
- Khi cần thời gian di chuyển chính xác

**API Endpoint:**
```
GET http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
```

**Response Example:**
```json
{
  "code": "Ok",
  "routes": [
    {
      "distance": 15420.5,      // mét
      "duration": 1845.2,       // giây
      "geometry": "encoded_polyline"
    }
  ]
}
```

**Xử lý trong code:**

```csharp
public async Task<(double distanceKm, double travelMinutes)> GetRoadDistanceAsync(
    double fromLat, double fromLon,
    double toLat, double toLon)
{
    try
    {
        // Gọi OSRM API
        var response = await _httpClient.GetAsync(
            $"http://router.project-osrm.org/route/v1/driving/{fromLon},{fromLat};{toLon},{toLat}");
        
        var data = await response.Content.ReadFromJsonAsync<OsmrResponse>();
        
        double distanceKm = data.routes[0].distance / 1000.0;
        double travelMinutes = data.routes[0].duration / 60.0;
        
        return (distanceKm, travelMinutes);
    }
    catch (Exception ex)
    {
        // FALLBACK: Dùng Haversine nếu OSRM thất bại
        double haversineKm = CalculateHaversineDistance(fromLat, fromLon, toLat, toLon);
        
        // Ước tính thời gian từ khoảng cách (giả sử tốc độ trung bình 35 km/h)
        double estimatedMinutes = (haversineKm / 35.0) * 60.0;
        
        return (haversineKm, estimatedMinutes);
    }
}
```

### 4.3 So Sánh Haversine vs OSRM

| Tiêu Chí | Haversine | OSRM |
|----------|-----------|------|
| **Độ chính xác** | Đường chim bay (~70-80% đường thực) | Đường bộ thực tế |
| **Performance** | Rất nhanh (tính toán local) | Chậm hơn (gọi API) |
| **Dependency** | Không phụ thuộc bên ngoài | Phụ thuộc OSRM server |
| **Use Case** | Lọc sơ bộ, estimate nhanh | Tính toán chi tiết, timeline |
| **Fallback** | Là fallback cho OSRM | Fallback về Haversine |

### 4.4 Distance Bracket cho Transport Selection

```csharp
public enum DistanceBracket {
    VeryShort,    // < 50km   → Local transport (xe máy, taxi)
    Short,        // 50-150km → Bus/Coach
    Medium,       // 150-300km → Bus hoặc Train
    Long,         // 300-600km → Train
    VeryLong,     // 600-1000km → Train hoặc Air
    UltraLong     // > 1000km → Air only
}

public static DistanceBracket GetDistanceBracket(double distanceKm)
{
    if (distanceKm < 50) return DistanceBracket.VeryShort;
    if (distanceKm < 150) return DistanceBracket.Short;
    if (distanceKm < 300) return DistanceBracket.Medium;
    if (distanceKm < 600) return DistanceBracket.Long;
    if (distanceKm < 1000) return DistanceBracket.VeryLong;
    return DistanceBracket.UltraLong;
}
```

---

## 5. Thuật Toán Tham Lam (Greedy) Xác Định Location và Lộ Trình

### 5.1 Greedy Nearest Neighbor - Sắp Thứ Tự Điểm Đến

**Mục tiêu:** Sắp xếp danh sách tỉnh/thành theo thứ tự tham quan hợp lý, không đi lòng vòng.

**Thuật toán:**

```csharp
public List<Province> OrderDestinationsByAttractionDensity(
    List<Province> destinations,
    Dictionary<int, List<Location>> attractionsByProvince,
    Province startPoint)
{
    var ordered = new List<Province>();
    var remaining = new HashSet<Province>(destinations);
    
    // Bắt đầu từ điểm xuất phát
    var currentLocation = startPoint;
    
    while (remaining.Count > 0)
    {
        Province nextDest = null;
        double bestScore = -1;
        
        foreach (var dest in remaining)
        {
            // Tính tâm của điểm đến (average lat/lon của các attractions)
            var attractions = attractionsByProvince[dest.Id];
            if (attractions.Count == 0) continue;
            
            double centerLat = attractions.Average(a => a.Latitude);
            double centerLon = attractions.Average(a => a.Longitude);
            
            // Tính khoảng cách từ vị trí hiện tại đến tâm điểm đến
            double distance = CalculateHaversineDistance(
                currentLocation.Latitude, currentLocation.Longitude,
                centerLat, centerLon);
            
            // HEURISTIC SCORE: attractionCount / distance
            // Ưu tiên: nhiều điểm tham quan + gần
            double score = attractions.Count / (distance + 0.1); // +0.1 tránh chia 0
            
            if (score > bestScore)
            {
                bestScore = score;
                nextDest = dest;
            }
        }
        
        if (nextDest != null)
        {
            ordered.Add(nextDest);
            remaining.Remove(nextDest);
            
            // Cập nhật vị trí hiện tại
            currentLocation = nextDest;
        }
    }
    
    return ordered;
}
```

**Ví dụ minh họa:**

```
Input: [Province A, Province B, Province C]
Start: Hà Nội

Attractions:
- Province A: 10 attractions, cách Hà Nội 100km
- Province B: 4 attractions, cách Hà Nội 50km
- Province C: 1 attraction, cách Hà Nội 20km

Vòng 1:
- Score A = 10 / 100 = 0.10
- Score B = 4 / 50 = 0.08
- Score C = 1 / 20 = 0.05
→ Chọn A (score cao nhất)

Vòng 2 (từ A):
- Score B = 4 / distance(A,B)
- Score C = 1 / distance(A,C)
→ Chọn B hoặc C tùy khoảng cách

Kết quả: [A, B, C] hoặc [A, C, B]
```

### 5.2 Largest Remainder Method - Phân Bổ Ngày

**Mục tiêu:** Phân chia số ngày cho mỗi tỉnh theo tỷ lệ số lượng điểm tham quan.

**Thuật toán:**

```csharp
public Dictionary<int, int> AllocateDaysToDestinations(
    List<Province> orderedDestinations,
    Dictionary<int, List<Location>> attractionsByProvince,
    int totalDays)
{
    var result = new Dictionary<int, int>();
    
    // Bước 1: Mỗi tỉnh tối thiểu 1 ngày
    foreach (var dest in orderedDestinations)
    {
        result[dest.Id] = 1;
    }
    
    int extraDays = totalDays - orderedDestinations.Count;
    if (extraDays <= 0) return result;
    
    // Bước 2: Tính weight cho mỗi tỉnh (căn cứ số attractions)
    var weights = new Dictionary<int, double>();
    double totalWeight = 0;
    
    foreach (var dest in orderedDestinations)
    {
        int attractionCount = attractionsByProvince[dest.Id].Count;
        
        // Weight = sqrt(attractionCount) để tránh bias quá lớn
        double weight = Math.Sqrt(attractionCount);
        weights[dest.Id] = weight;
        totalWeight += weight;
    }
    
    // Bước 3: Tính share (số ngày được phân bổ)
    var shares = new Dictionary<int, double>();
    var remainders = new Dictionary<int, double>();
    
    foreach (var dest in orderedDestinations)
    {
        double share = (weights[dest.Id] / totalWeight) * extraDays;
        int wholeDays = (int)Math.Floor(share);
        double remainder = share - wholeDays;
        
        result[dest.Id] += wholeDays;
        remainders[dest.Id] = remainder;
    }
    
    // Bước 4: Phân phối ngày dư theo largest remainder
    int daysToDistribute = extraDays - result.Sum(r => r.Value - 1);
    
    var sortedByRemainder = remainders
        .OrderByDescending(r => r.Value)
        .ToList();
    
    foreach (var kvp in sortedByRemainder.Take(daysToDistribute))
    {
        result[kvp.Key] += 1;
    }
    
    return result;
}
```

**Ví dụ chi tiết:**

```
Input: 3 tỉnh [A, B, C], totalDays = 7

Attractions:
- A: 10 attractions → weight = √10 ≈ 3.16
- B: 4 attractions  → weight = √4 = 2.00
- C: 1 attraction   → weight = √1 = 1.00

Total weight = 6.16
Extra days = 7 - 3 = 4

Tính share:
- A: (3.16 / 6.16) × 4 = 2.05 → 2 days + 0.05 remainder
- B: (2.00 / 6.16) × 4 = 1.30 → 1 day + 0.30 remainder
- C: (1.00 / 6.16) × 4 = 0.65 → 0 days + 0.65 remainder

Phân phối ngày dư (4 days):
- C: 0.65 (cao nhất) → +1 day
- B: 0.30 (thứ 2) → +1 day
- A: 0.05 (thứ 3) → +0 days
- Còn 1 day → +1 cho A (remainder cao nhất còn lại)

Kết quả:
- A: 1 + 2 + 1 = 4 ngày
- B: 1 + 1 + 1 = 3 ngày
- C: 1 + 1 + 0 = 2 ngày
Total: 9 ngày ❌ (sai, cần điều chỉnh)

Sửa lại:
- A: 1 + 2 = 3 ngày
- B: 1 + 1 = 2 ngày
- C: 1 + 0 + 1 (largest remainder) = 2 ngày
Total: 7 ngày ✓
```

### 5.3 Greedy Activity Picker - Chọn Địa Điểm Tiếp Theo

**Mục tiêu:** Chọn địa điểm tham quan tiếp theo trong ngày dựa trên composite score có trọng số khoảng cách.

**Thuật toán:**

```csharp
public Location PickNextAttraction(
    List<ScoredLocation> candidates,
    Location currentLocation,
    double remainingBudget,
    TimeSpan currentTime,
    TimeSpan dayEndTime,
    HashSet<int> visitedLocationIds)
{
    var available = candidates
        .Where(c => !visitedLocationIds.Contains(c.Location.Id))
        .ToList();
    
    Location bestChoice = null;
    double bestDynamicScore = -1;
    
    foreach (var candidate in available)
    {
        // 1. Tính khoảng cách
        double distanceKm = CalculateHaversineDistance(
            currentLocation.Latitude, currentLocation.Longitude,
            candidate.Location.Latitude, candidate.Location.Longitude);
        
        // 2. Tính thời gian di chuyển (OSRM hoặc Haversine fallback)
        double travelMinutes = (distanceKm / 35.0) * 60.0; // 35 km/h average
        
        // 3. Tính thời gian đến nơi
        TimeSpan arrivalTime = currentTime.AddMinutes(travelMinutes);
        
        // 4. Tính thời gian kết thúc
        int stayDuration = candidate.Location.RecommentDurationsMinutes;
        TimeSpan endTime = arrivalTime.AddMinutes(stayDuration);
        
        // 5. Kiểm tra thời gian còn trong ngày
        if (endTime > dayEndTime) continue;
        
        // 6. Tính chi phí
        double transportCost = CalculateLocalTransportCost(distanceKm, groupSize);
        double ticketCost = candidate.Location.PriceMin; // per person
        double totalCost = (transportCost + ticketCost) * groupSize;
        
        // 7. Kiểm tra budget
        if (totalCost > remainingBudget) continue;
        
        // 8. Tính DYNAMIC SCORE
        // Base Score (40%)
        double baseScore = candidate.Score;
        
        // Distance Score (30%) - ưu tiên gần
        double distanceScore = Math.Max(0, 100 - distanceKm * 10);
        
        // Time Efficiency (30%) - ưu tiên vừa với thời gian còn lại
        double remainingMinutes = (dayEndTime - currentTime).TotalMinutes;
        double timeNeeded = travelMinutes + stayDuration;
        double timeEfficiency = Math.Max(0, 100 - (timeNeeded / remainingMinutes * 100));
        
        // Composite Dynamic Score
        double dynamicScore = 
            baseScore * 0.4 + 
            distanceScore * 0.3 + 
            timeEfficiency * 0.3;
        
        if (dynamicScore > bestDynamicScore)
        {
            bestDynamicScore = dynamicScore;
            bestChoice = candidate.Location;
        }
    }
    
    return bestChoice;
}
```

**Phân tích trọng số:**

| Thành Phần | Trọng Số | Công Thức | Ý Nghĩa |
|------------|----------|-----------|---------|
| **Base Score** | 40% | `candidate.Score` | Chất lượng địa điểm |
| **Distance Score** | 30% | `max(0, 100 - distanceKm × 10)` | Ưu tiên gần (lười đi xa) |
| **Time Efficiency** | 30% | `max(0, 100 - (timeNeeded/remaining) × 100)` | Vừa với thời gian còn lại |

**Ví dụ:**

```
Current: 14:00, Day End: 21:30, Remaining Budget: 500,000đ

Candidates:
A. Bảo tàng - Score: 85, Distance: 2km, Stay: 90min, Ticket: 50k
B. Công viên - Score: 75, Distance: 8km, Stay: 120min, Ticket: 100k
C. Chùa - Score: 90, Distance: 15km, Stay: 60min, Ticket: 30k

Tính toán:

A. Bảo tàng:
   - Travel: 2km / 35 km/h × 60 = 3.4 min ≈ 4 min
   - Arrival: 14:04, End: 15:34 ✓ (trong ngày)
   - Cost: (4min transport ~10k + 50k ticket) × 4 people = 240k ✓
   - Distance Score: 100 - 2×10 = 80
   - Time Efficiency: 100 - (94/450 × 100) = 79
   - Dynamic Score: 85×0.4 + 80×0.3 + 79×0.3 = 81.7

B. Công viên:
   - Travel: 8km / 35 × 60 = 13.7 min ≈ 14 min
   - Arrival: 14:14, End: 16:14 ✓
   - Cost: (14min transport ~40k + 100k ticket) × 4 = 560k ❌ (vượt budget)
   → LOẠI

C. Chùa:
   - Travel: 15km / 35 × 60 = 25.7 min ≈ 26 min
   - Arrival: 14:26, End: 15:26 ✓
   - Cost: (26min transport ~70k + 30k ticket) × 4 = 400k ✓
   - Distance Score: 100 - 15×10 = -50 → 0 (quá xa)
   - Time Efficiency: 100 - (86/450 × 100) = 81
   - Dynamic Score: 90×0.4 + 0×0.3 + 81×0.3 = 60.3

→ Chọn A (Bảo tàng) với Dynamic Score = 81.7 ✓
```

---

## 6. Logic Kết Nối API Bên Ngoài - Phân Biệt Train, Plane, Bus

### 6.1 Transport API Public Contract

**Base URL:**
```
https://transport-api.helloworld.io.vn
```

**Authentication:**
```
Header: X-API-Key: YOUR_SECRET_TOKEN
```

### 6.2 Bus API

**Endpoint:**
```
GET /transport/bus
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fromId` | integer | Optional* | VeXeRe area ID (origin) |
| `fromLat` | number | Optional* | Latitude (cần fromLon) |
| `fromLon` | number | Optional* | Longitude (cần fromLat) |
| `toId` | integer | Optional* | VeXeRe area ID (destination) |
| `toLat` | number | Optional* | Latitude (cần toLon) |
| `toLon` | number | Optional* | Longitude (cần toLon) |
| `date` | string (date) | Optional | Departure date (YYYY-MM-DD) |
| `returnDate` | string (date) | Optional | Return date |
| `page` | integer | Optional | Page number (default: 1) |
| `pagesize` | integer | Optional | Page size (1-1000, default: 20) |

*Note: `fromId` mutually exclusive với `fromLat/fromLon`

**Request Example:**
```bash
curl https://transport-api.helloworld.io.vn/transport/bus \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --get \
  --data-urlencode 'fromId=18' \
  --data-urlencode 'toId=24' \
  --data-urlencode 'date=2026-03-21' \
  --data-urlencode 'pagesize=5'
```

**Response Structure:**
```json
{
  "query": {
    "input": {
      "fromId": "18",
      "toId": "24",
      "date": "2026-03-21",
      "returnDate": null,
      "page": 1,
      "pagesize": 5
    },
    "normalized": {
      "tripType": "one_way",
      "outbound": {
        "fromId": "18",
        "toId": "24",
        "date": "2026-03-23T00:00:00+07:00",
        "page": 1,
        "pagesize": 5
      },
      "return": null
    }
  },
  "resolved": {
    "outbound": {
      "from": {
        "id": "18",
        "name": "Dien Bien",
        "source": "input_id",
        "distance_m": null
      },
      "to": {
        "id": "24",
        "name": "Ha Noi",
        "source": "input_id",
        "distance_m": null
      }
    },
    "return": null
  },
  "fallback": {
    "outbound": {
      "attempted_dates": [
        "2026-03-21T00:00:00+07:00",
        "2026-03-22T00:00:00+07:00",
        "2026-03-23T00:00:00+07:00"
      ],
      "effective_date": "2026-03-23T00:00:00+07:00"
    },
    "return": null
  },
  "cache": {
    "outbound": {
      "status": "MISS",
      "type": "normal",
      "ttl_seconds": 21600
    },
    "return": null
  },
  "result": {
    "tripType": "one_way",
    "outbound": {
      "leg": "outbound",
      "fromId": "18",
      "toId": "24",
      "date": "2026-03-23",
      "empty": false,
      "count": 5,
      "page": 1,
      "pagesize": 5,
      "data": [
        {
          "idIndex": "sample",
          "tripId": "BUS123",
          "departureTime": "08:00",
          "arrivalTime": "14:30",
          "price": 450000,
          "vendor": "Mai Linh"
        }
      ]
    },
    "return": null
  }
}
```

**Xử lý trong code:**

```csharp
public async Task<BusSearchResult> SearchBusAsync(
    int? fromId,
    int? toId,
    DateTime date,
    DateTime? returnDate = null)
{
    var queryParams = new Dictionary<string, string>();
    
    if (fromId.HasValue)
        queryParams["fromId"] = fromId.Value.ToString();
    if (toId.HasValue)
        queryParams["toId"] = toId.Value.ToString();
    
    queryParams["date"] = date.ToString("yyyy-MM-dd");
    if (returnDate.HasValue)
        queryParams["returnDate"] = returnDate.Value.ToString("yyyy-MM-dd");
    
    var request = new HttpRequestMessage(HttpMethod.Get, "/transport/bus");
    request.Headers.Add("X-API-Key", _apiKey);
    request.RequestUri = new UriBuilder(request.RequestUri)
    {
        Query = BuildQueryString(queryParams)
    }.Uri;
    
    var response = await _httpClient.SendAsync(request);
    
    if (response.StatusCode == HttpStatusCode.OK)
    {
        var result = await response.Content.ReadFromJsonAsync<BusSearchResponse>();
        
        // Kiểm tra fallback
        if (result.fallback?.outbound?.effective_date != null)
        {
            // API đã tự động fallback sang ngày khác
            _logger.LogInformation(
                "Bus search fallback from {RequestedDate} to {EffectiveDate}",
                date,
                result.fallback.outbound.effective_date);
        }
        
        return new BusSearchResult
        {
            Success = true,
            TripType = result.result.tripType,
            FromLocation = result.resolved.outbound.from.name,
            ToLocation = result.resolved.outbound.to.name,
            EffectiveDate = result.fallback?.outbound?.effective_date ?? date,
            Routes = result.result.outbound.data.Select(d => new BusRoute
            {
                TripId = d.tripId,
                DepartureTime = d.departureTime,
                ArrivalTime = d.arrivalTime,
                Price = d.price,
                Vendor = d.vendor
            }).ToList(),
            IsEmpty = result.result.outbound.empty
        };
    }
    else if (response.StatusCode == HttpStatusCode.NotFound)
    {
        // fromId hoặc toId không tồn tại
        return new BusSearchResult { Success = false, Error = "Invalid location ID" };
    }
    else if ((int)response.StatusCode == 429)
    {
        // Rate limit exceeded
        return new BusSearchResult { Success = false, Error = "Rate limit exceeded" };
    }
    else if ((int)response.StatusCode >= 500)
    {
        // Upstream error
        return new BusSearchResult { Success = false, Error = "Upstream service unavailable" };
    }
    
    return new BusSearchResult { Success = false, Error = "Unknown error" };
}
```

### 6.3 Flight API

**Endpoints:**
```
GET /transport/flight        - Search flights
GET /transport/flight/count  - Monthly count data
```

**Đặc điểm:**
- Chỉ hỗ trợ **domestic airports** (sân bay nội địa)
- Sử dụng **IATA codes** (3 ký tự, ví dụ: SGN, HAN, DAD)
- Hỗ trợ **one-way** và **round-trip**
- Có **cache metadata** cho mỗi leg
- Có **monthly count data** cho thống kê

**Request Example:**
```bash
curl https://transport-api.helloworld.io.vn/transport/flight \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --get \
  --data-urlencode 'fromIata=SGN' \
  --data-urlencode 'toIata=HAN' \
  --data-urlencode 'date=2026-03-21' \
  --data-urlencode 'returnDate=2026-03-25' \
  --data-urlencode 'cabin=economy'
```

**Response Structure:**
```json
{
  "query": {
    "input": {
      "fromIata": "SGN",
      "toIata": "HAN",
      "date": "2026-03-21",
      "returnDate": "2026-03-25",
      "cabin": "economy"
    },
    "normalized": {
      "tripType": "round_trip",
      "outbound": {
        "fromIata": "SGN",
        "toIata": "HAN",
        "date": "2026-03-21"
      },
      "return": {
        "fromIata": "HAN",
        "toIata": "SGN",
        "date": "2026-03-25"
      }
    }
  },
  "resolved": {
    "outbound": {
      "from": {
        "iata": "SGN",
        "name": "Sân bay Tân Sơn Nhất",
        "city": "Hồ Chí Minh"
      },
      "to": {
        "iata": "HAN",
        "name": "Sân bay Nội Bài",
        "city": "Hà Nội"
      }
    },
    "return": {
      "from": {
        "iata": "HAN",
        "name": "Sân bay Nội Bài",
        "city": "Hà Nội"
      },
      "to": {
        "iata": "SGN",
        "name": "Sân bay Tân Sơn Nhất",
        "city": "Hồ Chí Minh"
      }
    }
  },
  "result": {
    "tripType": "round_trip",
    "outbound": {
      "flights": [
        {
          "flightNumber": "VNA123",
          "airline": "Vietnam Airlines",
          "departureTime": "08:00",
          "arrivalTime": "10:00",
          "duration": 120,
          "price": 1850000,
          "cabin": "economy",
          "availableSeats": 15
        },
        {
          "flightNumber": "VJC456",
          "airline": "VietJet Air",
          "departureTime": "14:30",
          "arrivalTime": "16:30",
          "duration": 120,
          "price": 1250000,
          "cabin": "economy",
          "availableSeats": 42
        }
      ]
    },
    "return": {
      "flights": [...]
    }
  }
}
```

### 6.4 Train API

**Endpoints:**
```
GET /transport/train        - Search trains
GET /transport/train/count  - Monthly count data
```

**Đặc điểm:**
- Chỉ hỗ trợ **domestic stations** (ga trong nước)
- Sử dụng **station codes** (ví dụ: HN, SG, DA)
- Hỗ trợ **one-way** và **round-trip**
- Có **seat filtering** (optional)
- **Passenger groups** được expose rõ ràng
- **Count API** collapse passenger groups vào total quantity

**Request Example:**
```bash
curl https://transport-api.helloworld.io.vn/transport/train \
  --header 'X-API-Key: YOUR_SECRET_TOKEN' \
  --get \
  --data-urlencode 'fromStation=HN' \
  --data-urlencode 'toStation=SG' \
  --data-urlencode 'date=2026-03-21' \
  --data-urlencode 'seatType=hard_seat'
```

### 6.5 Heuristic Inter-City Route Estimator

**Logic chọn phương tiện liên tỉnh:**

```csharp
public async Task<InterCityTransportOption> EstimateAsync(
    Province fromProvince,
    Province toProvince,
    int groupSize)
{
    // 1. Tính khoảng cách Haversine
    double distanceKm = CalculateHaversineDistance(
        fromProvince.Latitude, fromProvince.Longitude,
        toProvince.Latitude, toProvince.Longitude);
    
    // 2. Chọn category dựa trên khoảng cách và group size
    TransportCategory category = SelectCategory(distanceKm, groupSize);
    
    /*
    SelectCategory Logic:
    
    if (distanceKm > 1000)
        return TransportCategory.Air;  // Máy bay
    
    if (distanceKm > 600)
    {
        if (groupSize > 4)
            return TransportCategory.Air;  // Nhóm lớn → máy bay (nhanh hơn)
        else
            return TransportCategory.Rail; // Tàu hỏa
    }
    
    if (distanceKm > 300)
        return TransportCategory.Rail;  // Tàu hỏa
    
    return TransportCategory.Road;  // Xe khách liên tỉnh
    */
    
    // 3. Load TransportModes từ DB theo category
    var transportModes = _dbContext.TransportModes
        .Where(tm => tm.Category == category)
        .ToList();
    
    // Chọn mode có CostPerKm thấp nhất trong category
    var selectedMode = transportModes
        .OrderBy(tm => tm.CostPerKm)
        .FirstOrDefault();
    
    // 4. Gọi External API tương ứng
    TransportSearchResult apiResult = category switch
    {
        TransportCategory.Air => await SearchFlightAsync(fromProvince, toProvince),
        TransportCategory.Rail => await SearchTrainAsync(fromProvince, toProvince),
        TransportCategory.Road => await SearchBusAsync(fromProvince, toProvince),
        _ => null
    };
    
    // 5. Fallback nếu API thất bại hoặc rỗng
    if (apiResult == null || apiResult.IsEmpty)
    {
        // Fallback: Tính giá bracket
        decimal bracketCost = GetBracketCostPerPerson(distanceKm, category);
        
        return new InterCityTransportOption
        {
            Method = category.ToString(),
            FromProvince = fromProvince.Name,
            ToProvince = toProvince.Name,
            DistanceKm = distanceKm,
            PerPersonCost = bracketCost,
            TotalCost = bracketCost * groupSize,
            TravelMinutes = EstimateTravelTime(distanceKm, category),
            IsFallback = true,
            Note = "API search returned no results. Using estimated pricing."
        };
    }
    
    // 6. Nếu có DB pricing → blend với bracket
    if (selectedMode != null)
    {
        decimal kmCost = selectedMode.CostPerKm * (decimal)distanceKm;
        decimal bracketCost = GetBracketCostPerPerson(distanceKm, category);
        
        // Clamp kmCost trong khoảng [bracket×0.6, bracket×2.2]
        decimal perPersonCost = Math.Max(
            bracketCost * 0.6m,
            Math.Min(kmCost, bracketCost * 2.2m));
        
        return new InterCityTransportOption
        {
            Method = selectedMode.Name,
            FromProvince = fromProvince.Name,
            ToProvince = toProvince.Name,
            DistanceKm = distanceKm,
            PerPersonCost = perPersonCost,
            TotalCost = perPersonCost * groupSize,
            TravelMinutes = EstimateTravelTime(distanceKm, selectedMode.SpeedKmh),
            IsFallback = false
        };
    }
    
    // 7. Fallback cuối cùng
    return CreateFallbackOption(distanceKm, category, groupSize);
}
```

### 6.6 Bracket Pricing Fallback

```csharp
public decimal GetBracketCostPerPerson(double distanceKm, TransportCategory category)
{
    return category switch
    {
        TransportCategory.Air => distanceKm > 1000 ? 1_800_000 : 1_000_000,
        
        TransportCategory.Road => distanceKm < 150 ? 200_000
                               : distanceKm < 300 ? 400_000
                               : distanceKm < 600 ? 650_000
                               : 1_000_000,
        
        TransportCategory.Rail => distanceKm < 300 ? 300_000
                               : distanceKm < 600 ? 600_000
                               : 1_200_000,
        
        _ => 500_000
    };
}
```

### 6.7 Travel Time Estimation

```csharp
public int EstimateTravelTime(double distanceKm, TransportCategory category)
{
    int speedKmh = category switch
    {
        TransportCategory.Air => 700,   // km/h
        TransportCategory.Rail => 70,   // km/h
        TransportCategory.Road => 45,   // km/h (xe khách)
        _ => 50
    };
    
    // Overhead: thời gian làm thủ tục
    int overheadMinutes = category switch
    {
        TransportCategory.Air => 150,   // Check-in + security + boarding (2.5h)
        TransportCategory.Rail => 30,   // Check-in tại ga (30min)
        TransportCategory.Road => 30,   // Đón khách, xếp hàng (30min)
        _ => 30
    };
    
    int travelMinutes = (int)Math.Ceiling(distanceKm / speedKmh * 60) + overheadMinutes;
    
    return travelMinutes;
}
```

### 6.8 Resolve Transit Hub Names

```csharp
public async Task<string> ResolveHubNameAsync(
    Province province,
    TransportCategory category)
{
    var hub = await _dbContext.TransitHubs
        .Include(th => th.TransitHubType)
        .FirstOrDefaultAsync(th => 
            th.ProvinceId == province.Id &&
            th.TransportationId == (int)category);
    
    if (hub != null)
    {
        return hub.Name; // Ví dụ: "Sân bay Tân Sơn Nhất", "Ga Sài Gòn"
    }
    
    // Fallback: tên chung
    return category switch
    {
        TransportCategory.Air => $"{province.Name} Airport",
        TransportCategory.Rail => $"{province.Name} Station",
        TransportCategory.Road => $"{province.Name} Bus Station",
        _ => province.Name
    };
}
```

### 6.9 First-Mile Optimization

**Logic xử lý chặng đầu từ current location của user:**

```csharp
public TransportOption HandleFirstLeg(
    GeoCoordinate userLocation,
    Province firstDestination,
    int groupSize)
{
    double distanceKm = CalculateHaversineDistance(
        userLocation.Latitude, userLocation.Longitude,
        firstDestination.CenterLatitude, firstDestination.CenterLongitude);
    
    // Nếu < 50km → skip máy bay/tàu, dùng local transport
    if (distanceKm < 50)
    {
        return BuildLocalTransportOptions(distanceKm, groupSize)
            .FirstOrDefault(opt => opt.Recommended);
    }
    
    // Nếu >= 50km → dùng inter-city transport (bus/train/plane)
    return EstimateAsync(userLocationProvince, firstDestination, groupSize);
}
```

---

## 7. Hệ Thống Chấm Điểm (Scoring System)

### 7.1 Composite Score cho Attractions

```
┌────────────────────────────────────────────────────────────┐
│  Composite Score = 40% Quality + 35% Time + 25% Cost      │
└────────────────────────────────────────────────────────────┘
```

### 7.2 Quality Score (40%)

```csharp
public double CalculateQualityScore(Location location, List<int> favoriteTagIds)
{
    // Bước 1: Normalize Location.Score về thang 100
    double baseQuality = NormalizeScore(location.Score, fallback: 50);
    
    /*
    NormalizeScore Logic:
    
    if (score <= 0) return fallback;  // Score âm hoặc 0 → fallback
    if (score <= 5) return score * 20;  // Thang 0-5 → 0-100
    if (score <= 10) return score * 10; // Thang 0-10 → 0-100
    return Math.Min(100, score);  // Cap ở 100
    */
    
    // Bước 2: Tag Relevance
    if (favoriteTagIds == null || !favoriteTagIds.Any())
    {
        return baseQuality;
    }
    
    int matchCount = 0;
    string searchableText = $"{location.Name} {location.Description} {location.LocationType?.TypeName}"
        .ToLowerInvariant();
    
    foreach (var tagId in favoriteTagIds)
    {
        var tag = _tagsById[tagId];
        if (searchableText.Contains(tag.Title.ToLowerInvariant()))
        {
            matchCount++;
        }
    }
    
    // +10 điểm cho mỗi tag match, tối đa 100
    double qualityScore = Math.Min(100, baseQuality + matchCount * 10);
    
    return qualityScore;
}
```

### 7.3 Time Efficiency Score (35%)

```csharp
public double CalculateTimeEfficiencyScore(Location location)
{
    // Lấy thời lượng lưu trú đề xuất
    double stayMinutes = location.RecommentDurationsMinutes > 0
        ? location.RecommentDurationsMinutes
        : 60; // Default 60 phút
    
    // Công thức: 100 - (stayMinutes - 30) / 3
    // 30 phút → 100 điểm (tối ưu)
    // 90 phút → 80 điểm
    // 150 phút → 60 điểm
    // 270 phút → 20 điểm
    
    double timeEfficiencyScore = Math.Max(0, 100 - (stayMinutes - 30) / 3.0);
    
    return timeEfficiencyScore;
}
```

### 7.4 Cost Efficiency Score (25%)

```csharp
public double CalculateCostEfficiencyScore(Location location)
{
    // Tính giá bình quân per person
    decimal avgPrice = (location.PriceMin + location.PriceMax) / 2;
    
    // Công thức: 100 - (avgPrice / 5000)
    // Miễn phí → 100 điểm
    // 50.000đ → 90 điểm
    // 250.000đ → 50 điểm
    // 500.000đ → 0 điểm
    
    double costEfficiencyScore = Math.Max(0, 100 - (double)(avgPrice / 5000));
    
    return costEfficiencyScore;
}
```

### 7.5 Hotel Scoring

```
┌────────────────────────────────────────────────────────────┐
│  Hotel Score = 25% Distance + 35% Budget +               │
│                25% GroupSize + 15% Amenities              │
└────────────────────────────────────────────────────────────┘
```

```csharp
public double CalculateHotelScore(
    Location hotel,
    double distanceToCenter,
    double dailyBudget,
    int groupSize)
{
    // 1. Distance Score (25%)
    double distanceScore = Math.Max(0, 100 - distanceToCenter * 15);
    
    // 2. Budget Fit Score (35%)
    decimal avgNightPrice = (hotel.PriceMin + hotel.PriceMax) / 2;
    double budgetScore = Math.Max(0, 100 - (double)(avgNightPrice / dailyBudget * 100));
    
    // 3. Group Fit Score (25%)
    double groupScore = CalculateGroupSizeSuitabilityScore(hotel, groupSize);
    
    // 4. Amenities Score (15%)
    double amenitiesScore = Math.Min(100, hotel.Amenities.Count * 15);
    
    // Composite
    double totalScore = 
        distanceScore * 0.25 +
        budgetScore * 0.35 +
        groupScore * 0.25 +
        amenitiesScore * 0.15;
    
    return totalScore;
}
```

---

## 8. Quản Lý Ngân Sách (Budget Management)

### 8.1 Contingency Fund Calculation

```csharp
public double CalculateContingencyPercentage(decimal totalBudget)
{
    // Ngân sách càng cao → tỷ lệ dự phòng càng thấp
    if (totalBudget < 5_000_000)   return 0.20; // 20%
    if (totalBudget < 10_000_000)  return 0.15; // 15%
    if (totalBudget < 20_000_000)  return 0.10; // 10%
    if (totalBudget < 50_000_000)  return 0.08; // 8%
    return 0.05;                                  // 5%
}

public decimal CalculateContingencyFund(decimal totalBudget)
{
    double percentage = CalculateContingencyPercentage(totalBudget);
    return totalBudget * (decimal)percentage;
}
```

### 8.2 Budget Decomposition

```csharp
public BudgetSummary DecomposeBudget(
    decimal totalBudget,
    int totalDays,
    List<Province> destinations,
    int groupSize)
{
    // 1. Contingency Fund
    decimal contingencyFund = CalculateContingencyFund(totalBudget);
    decimal usableBudget = totalBudget - contingencyFund;
    
    // 2. Inter-City Transport Budget
    decimal transportBudget = 0;
    for (int i = 0; i < destinations.Count - 1; i++)
    {
        var option = EstimateAsync(destinations[i], destinations[i + 1], groupSize);
        transportBudget += option.TotalCost;
    }
    
    // 3. Accommodation Budget (ước tính)
    decimal accommodationBudget = EstimateAccommodationBudget(
        destinations, totalDays, groupSize);
    
    // 4. Activity Budget (remaining)
    decimal activityBudget = usableBudget - transportBudget - accommodationBudget;
    
    return new BudgetSummary
    {
        TotalBudget = totalBudget,
        ContingencyFund = contingencyFund,
        UsableBudget = usableBudget,
        TransportBudget = transportBudget,
        AccommodationBudget = accommodationBudget,
        ActivityBudget = activityBudget
    };
}
```

### 8.3 Daily Weight Distribution

```csharp
public Dictionary<int, double> CalculateDayWeights(int totalDays)
{
    var weights = new Dictionary<int, double>();
    
    for (int day = 1; day <= totalDays; day++)
    {
        double weight = day switch
        {
            1 => 1.3,  // Ngày đầu: +30% (háo hức, check-in, mua sắm)
            2 => 1.1,  // Ngày 2: +10% (vẫn còn năng lượng)
            _ => 1.0   // Các ngày giữa: bình thường
        };
        
        if (day == totalDays)
        {
            weight = 1.2;  // Ngày cuối: +20% (souvenir, checkout)
        }
        
        weights[day] = weight;
    }
    
    return weights;
}

public decimal CalculateWeightedDailyBudget(
    decimal activityBudget,
    int dayNumber,
    int totalDays,
    decimal rolloverFromPreviousDay = 0)
{
    var weights = CalculateDayWeights(totalDays);
    double totalWeight = weights.Values.Sum();
    
    double dayWeight = weights[dayNumber];
    decimal baseDailyBudget = activityBudget / (decimal)totalWeight;
    
    decimal weightedBudget = baseDailyBudget * (decimal)dayWeight + rolloverFromPreviousDay;
    
    return weightedBudget;
}
```

### 8.4 Limit/Floor và Rollover

```csharp
public (decimal floor, decimal limit) CalculateBudgetBounds(decimal weightedBudget)
{
    // Floor: giới hạn dưới (-30%)
    decimal floor = weightedBudget * 0.7m;
    
    // Limit: giới hạn trên (+30%)
    decimal limit = weightedBudget * 1.3m;
    
    return (floor, limit);
}

public decimal CalculateRollover(
    decimal limit,
    decimal activitySpent,
    decimal nextDayLimit)
{
    // Số dư được cuộn sang ngày sau
    decimal rollover = Math.Max(0, limit - activitySpent);
    
    // Cap ở 50% giới hạn ngày hôm sau
    decimal maxRollover = nextDayLimit * 0.5m;
    
    return Math.Min(rollover, maxRollover);
}
```

---

## 9. Xây Dựng Timeline Theo Ngày

### 9.1 Timeline Structure

```
┌─────────────────────────────────────────────────────────────┐
│  NGÀY 1 (Day 1)                                             │
├─────────────────────────────────────────────────────────────┤
│  06:30 - 07:00  First-Mile Transport (user → destination)  │
│  07:00 - 08:30  Di chuyển liên tỉnh (Inter-City)           │
│  08:30 - 12:00  Activity 1, Activity 2                      │
│  12:00 - 13:00  Lunch Break                                 │
│  13:00 - 14:00  Check-in Accommodation                      │
│  14:00 - 18:00  Activity 3, Activity 4                      │
│  18:00 - 19:00  Dinner                                      │
│  19:00 - 21:00  Evening Activity                            │
│  21:00 - 06:30  Night Rest                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  NGÀY 2+ (Middle Days)                                      │
├─────────────────────────────────────────────────────────────┤
│  08:00 - 08:30  Breakfast                                   │
│  08:30 - 12:00  Activity 1, Activity 2                      │
│  12:00 - 13:00  Lunch Break                                 │
│  13:00 - 18:00  Activity 3, Activity 4                      │
│  18:00 - 19:00  Dinner                                      │
│  19:00 - 21:00  Free Time / Evening Activity                │
│  21:00 - 08:00  Night Rest (same accommodation)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  NGÀY CUỐI (Return Day)                                     │
├─────────────────────────────────────────────────────────────┤
│  08:00 - 12:00  Activity 1                                  │
│  12:00 - 13:00  Lunch + Check-out                           │
│  13:00 - 17:00  Free Time / Last Shopping                   │
│  17:00 - 19:00  Inter-City Transport (return leg)           │
│  19:00 - 21:00  Di chuyển về vị trí ban đầu                 │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Daily Itinerary Builder

```csharp
public DailyItineraryDto BuildDayItinerary(
    int dayNumber,
    DateTime date,
    Province province,
    List<ScoredLocation> candidates,
    ref decimal remainingBudget,
    ref Location currentLocation,
    HashSet<int> visitedLocationIds,
    TransportOption transferFromPrevious = null)
{
    var activities = new List<ActivityPlanDto>();
    var travelLegs = new List<TravelLegDto>();
    var notes = new List<string>();
    
    // Thời gian bắt đầu và kết thúc ngày
    TimeSpan dayStartTime = dayNumber == 1 ? new TimeSpan(6, 30, 0) : new TimeSpan(8, 0, 0);
    TimeSpan dayEndTime = new TimeSpan(21, 30, 0);
    TimeSpan currentTime = dayStartTime;
    
    // Ngày 1: Thêm inter-city transport
    if (dayNumber == 1 && transferFromPrevious != null)
    {
        travelLegs.Add(new TravelLegDto
        {
            FromLocationName = "Xuất phát",
            ToLocationName = $"{province.Name} City Center",
            DepartureTime = currentTime,
            ArrivalTime = currentTime.AddMinutes(transferFromPrevious.TravelTimeMinutes),
            DistanceKm = transferFromPrevious.DistanceKm,
            SelectedMethod = transferFromPrevious.Method,
            SelectedTravelTimeMinutes = transferFromPrevious.TravelTimeMinutes,
            SelectedTotalCost = transferFromPrevious.TotalCost,
            TransportOptions = new[] { transferFromPrevious }
        });
        
        remainingBudget -= transferFromPrevious.TotalCost;
        currentTime = currentTime.AddMinutes(transferFromPrevious.TravelTimeMinutes);
        
        notes.Add($"Transport guidance: {transferFromPrevious.Method} từ {transferFromPrevious.DepartureHub} đến {transferFromPrevious.ArrivalHub}. Estimated {transferFromPrevious.TravelTimeMinutes} phút, total {transferFromPrevious.TotalCost:N0}đ (~{transferFromPrevious.PerPersonCost:N0}đ/người).");
    }
    
    // Ngày 1: Check-in accommodation (>= 13:00)
    bool accommodationCheckedIn = false;
    
    // Vòng lặp chọn activities
    int activityCount = 0;
    const int maxActivitiesPerDay = 6;
    
    while (activityCount < maxActivitiesPerDay && currentTime < dayEndTime)
    {
        // Chọn activity tiếp theo
        var nextActivity = PickNextAttraction(
            candidates,
            currentLocation,
            remainingBudget,
            currentTime,
            dayEndTime,
            visitedLocationIds);
        
        if (nextActivity == null) break; // Không còn activity phù hợp
        
        // Tính khoảng cách và transport
        double distanceKm = CalculateHaversineDistance(
            currentLocation.Latitude, currentLocation.Longitude,
            nextActivity.Latitude, nextActivity.Longitude);
        
        var transportOptions = BuildLocalTransportOptions(distanceKm, groupSize);
        var selectedTransport = transportOptions.FirstOrDefault(opt => opt.Recommended)
            ?? transportOptions.OrderBy(opt => opt.TotalCost).First();
        
        TimeSpan departureTime = currentTime;
        TimeSpan arrivalTime = departureTime.AddMinutes(selectedTransport.TravelTimeMinutes);
        
        // Kiểm tra giờ mở cửa
        bool isOpen = IsOpenAtTime(nextActivity, date.DayOfWeek, arrivalTime);
        if (!isOpen) continue;
        
        // Tính chi phí
        decimal ticketCost = nextActivity.PriceMin * groupSize;
        decimal extraSpending = EstimateExtraSpending(nextActivity, tripSegment, groupSize);
        decimal totalActivityCost = ticketCost + extraSpending + selectedTransport.TotalCost;
        
        if (totalActivityCost > remainingBudget) continue;
        
        // Thời gian lưu trú
        int stayDuration = nextActivity.RecommentDurationsMinutes;
        TimeSpan endTime = arrivalTime.AddMinutes(stayDuration);
        
        // Check-in accommodation nếu chưa và >= 13:00
        if (!accommodationCheckedIn && endTime >= new TimeSpan(13, 0, 0))
        {
            accommodationCheckedIn = true;
            // Sẽ thêm accommodation event sau
        }
        
        // Thêm activity vào timeline
        activities.Add(new ActivityPlanDto
        {
            LocationName = nextActivity.Name,
            StartTime = arrivalTime,
            EndTime = endTime,
            TravelCost = selectedTransport.TotalCost,
            TicketCost = ticketCost,
            ExtraSpendingCost = extraSpending,
            TotalCost = totalActivityCost
        });
        
        // Thêm travel leg
        travelLegs.Add(new TravelLegDto
        {
            FromLocationName = currentLocation.Name,
            ToLocationName = nextActivity.Name,
            DepartureTime = departureTime,
            ArrivalTime = arrivalTime,
            DistanceKm = distanceKm,
            SelectedMethod = selectedTransport.Method,
            SelectedTravelTimeMinutes = selectedTransport.TravelTimeMinutes,
            SelectedTotalCost = selectedTransport.TotalCost,
            TransportOptions = transportOptions
        });
        
        // Cập nhật state
        remainingBudget -= totalActivityCost;
        currentTime = endTime.AddMinutes(15); // 15 phút buffer
        currentLocation = nextActivity;
        visitedLocationIds.Add(nextActivity.Id);
        activityCount++;
    }
    
    // Ngày cuối: Return leg (sau 17:00)
    if (dayNumber == totalDays)
    {
        var returnTransport = EstimateAsync(province, fromProvince, groupSize);
        
        travelLegs.Add(new TravelLegDto
        {
            FromLocationName = $"{province.Name} City Center",
            ToLocationName = "Về điểm xuất phát",
            DepartureTime = new TimeSpan(17, 0, 0),
            ArrivalTime = new TimeSpan(17, 0, 0).AddMinutes(returnTransport.TravelTimeMinutes),
            DistanceKm = returnTransport.DistanceKm,
            SelectedMethod = returnTransport.Method,
            SelectedTravelTimeMinutes = returnTransport.TravelTimeMinutes,
            SelectedTotalCost = returnTransport.TotalCost
        });
        
        remainingBudget -= returnTransport.TotalCost;
    }
    
    return new DailyItineraryDto
    {
        DayNumber = dayNumber,
        Date = date,
        ProvinceId = province.Id,
        ProvinceName = province.Name,
        Activities = activities,
        TravelLegs = travelLegs,
        Notes = notes,
        EstimatedSpend = /* tính tổng chi phí ngày */,
        RolloverToNextDay = /* tính rollover */
    };
}
```

### 9.3 Opening Hours Check

```csharp
public bool IsOpenAtTime(Location location, DayOfWeek dayOfWeek, TimeSpan time)
{
    // Map DayOfWeek (enum) sang 1-7 (Thứ 2 - Chủ Nhật)
    int dayNumber = dayOfWeek switch
    {
        DayOfWeek.Monday => 1,
        DayOfWeek.Tuesday => 2,
        DayOfWeek.Wednesday => 3,
        DayOfWeek.Thursday => 4,
        DayOfWeek.Friday => 5,
        DayOfWeek.Saturday => 6,
        DayOfWeek.Sunday => 7,
        _ => 1
    };
    
    var openingHour = location.OpeningHours
        .FirstOrDefault(oh => oh.DayOfWeek == dayNumber);
    
    if (openingHour == null) return true; // Không có giờ mở cửa → luôn mở
    
    bool isOpen = time >= openingHour.OpenTime && time <= openingHour.CloseTime;
    
    return isOpen;
}
```

---

## 10. Tích Hợp Phương Tiện Di Chuyển

### 10.1 Local Transport Options

```csharp
public List<TransportOption> BuildLocalTransportOptions(
    double distanceKm,
    int groupSize)
{
    var options = new List<TransportOption>();
    
    // Walking (miễn phí)
    if (distanceKm <= 1.2)
    {
        options.Add(new TransportOption
        {
            Method = "Walking",
            TotalCost = 0,
            TravelTimeMinutes = (int)(distanceKm / 4.0 * 60), // 4 km/h
            VehiclesNeeded = 0,
            Pros = "Free, eco-friendly, good for health",
            Cons = "Slow, only for short distances, weather dependent",
            Recommended = distanceKm <= 0.8
        });
    }
    
    // Ride-hailing bike (Grab Bike, Gojek)
    if (groupSize <= 2 && distanceKm <= 15)
    {
        int vehiclesNeeded = (int)Math.Ceiling(groupSize / 2.0);
        options.Add(new TransportOption
        {
            Method = "Ride-hailing bike",
            TotalCost = (int)(9_000 * distanceKm * vehiclesNeeded),
            TravelTimeMinutes = (int)(distanceKm / 35.0 * 60),
            VehiclesNeeded = vehiclesNeeded,
            Pros = "Cheap, fast in traffic, easy to book",
            Cons = "Exposed to weather, limited luggage space",
            Recommended = groupSize <= 2 && distanceKm <= 10
        });
    }
    
    // Taxi 4-seat
    if (groupSize <= 4)
    {
        options.Add(new TransportOption
        {
            Method = "Taxi 4-seat",
            TotalCost = (int)(15_000 * distanceKm),
            TravelTimeMinutes = (int)(distanceKm / 30.0 * 60),
            VehiclesNeeded = 1,
            Pros = "Fast, comfortable, door-to-door, AC",
            Cons = "More expensive than bike",
            Recommended = groupSize <= 4 && distanceKm < 50
        });
    }
    
    // 7-seat car
    if (groupSize <= 7)
    {
        int vehiclesNeeded = (int)Math.Ceiling(groupSize / 7.0);
        options.Add(new TransportOption
        {
            Method = "7-seat car",
            TotalCost = (int)(20_000 * distanceKm * vehiclesNeeded),
            TravelTimeMinutes = (int)(distanceKm / 30.0 * 60),
            VehiclesNeeded = vehiclesNeeded,
            Pros = "Good balance of cost and comfort, fits medium groups",
            Cons = "May need multiple vehicles for large groups"
        });
    }
    
    // 16-seat van
    if (groupSize > 7)
    {
        int vehiclesNeeded = (int)Math.Ceiling(groupSize / 16.0);
        options.Add(new TransportOption
        {
            Method = "16-seat van",
            TotalCost = (int)(35_000 * distanceKm * vehiclesNeeded),
            TravelTimeMinutes = (int)(distanceKm / 30.0 * 60),
            VehiclesNeeded = vehiclesNeeded,
            Pros = "Best for large groups, everyone travels together",
            Cons = "Higher total cost, slower acceleration"
        });
    }
    
    return options;
}
```

### 10.2 Transport Selection Logic

```csharp
public TransportOption SelectBestTransport(
    List<TransportOption> options,
    int groupSize,
    decimal budget)
{
    // Filter options fits budget
    var fitsBudget = options.Where(opt => opt.TotalCost <= budget).ToList();
    
    if (!fitsBudget.Any())
    {
        // Không có option nào vừa budget → chọn rẻ nhất
        return options.OrderBy(opt => opt.TotalCost).First();
    }
    
    // Ưu tiên option được recommended
    var recommended = fitsBudget.FirstOrDefault(opt => opt.Recommended);
    if (recommended != null) return recommended;
    
    // Nếu không có recommended → chọn cân bằng thời gian và chi phí
    var bestValue = fitsBudget
        .Select(opt => new
        {
            opt,
            score = opt.TravelTimeMinutes * 0.55 + (double)opt.TotalCost * 0.00035
        })
        .OrderBy(x => x.score)
        .First();
    
    return bestValue.opt;
}
```

---

## 11. Các Giới Hạn và Lưu Ý

### 11.1 Limitations Hiện Tại

| Vấn Đề | Mức Độ | Chi Tiết | Giải Pháp Đề Xuất |
|--------|--------|----------|-------------------|
| **OSRM quá độ** | 🔴 Cao | Gọi OSRM API quá nhiều trong vòng for lặp → latency cao | Cache kết quả OSRM, batch requests |
| **Tag Matching thô** | 🟡 Trung bình | String Contains case-insensitive → keyword pollution | Dùng full-text search hoặc embedding |
| **Thời gian cứng nhắc** | 🟡 Trung bình | Mốc cố định 06:30, 13:00, 21:00, 17:00 | Dynamic time allocation dựa trên activity type |
| **Một khách sạn/toàn trip** | 🟡 Trung bình | Không đổi nơi ở với trip dài | Multi-hotel optimization cho trip > 5 ngày |
| **IsOpenAtTime luôn true** | 🔴 Cao | Chưa implement thực tế | Tích hợp Google Places API hoặc manual data |
| **Haversine vs road distance** | 🟡 Trung bình | Tính đường chim bay, không phải đường thực | Luôn dùng OSRM khi có thể |
| **EstimateExtraSpending dùng Random** | 🟡 Trung bình | Chi phí extra không deterministic | Dùng distribution dựa trên historical data |
| **Không backtracking** | 🟡 Trung bình | Budget thiếu → không thử lại attraction khác | Implement backtracking hoặc beam search |

### 11.2 Best Practices

```csharp
// ✅ GOOD: Graceful fallback
try
{
    var osrmResult = await GetRoadDistanceAsync(...);
}
catch
{
    var haversineResult = CalculateHaversineDistance(...);
}

// ✅ GOOD: Cache OSRM results
var cacheKey = $"osrm:{lat1}:{lon1}:{lat2}:{lon2}";
if (!_cache.TryGetValue(cacheKey, out var cached))
{
    cached = await FetchOsmrAsync(...);
    _cache.Set(cacheKey, cached, TimeSpan.FromHours(24));
}

// ✅ GOOD: Batch location queries
var locationIds = candidates.Select(c => c.Id).ToList();
var locations = await _dbContext.Locations
    .Include(l => l.Tags)
    .Include(l => l.OpeningHours)
    .Where(l => locationIds.Contains(l.Id))
    .ToListAsync();

// ❌ BAD: N+1 query
foreach (var candidate in candidates)
{
    var location = await _dbContext.Locations
        .Include(l => l.Tags)  // Query mới mỗi lần!
        .FirstOrDefaultAsync(l => l.Id == candidate.Id);
}
```

### 11.3 Performance Optimization

```csharp
// 1. Pre-load data
var allProvinces = await _dbContext.Provinces.ToListAsync();
var provinceById = allProvinces.ToDictionary(p => p.Id);

var allLocations = await _dbContext.Locations
    .Include(l => l.Tags)
    .Include(l => l.LocationType)
    .Include(l => l.OpeningHours)
    .ToListAsync();

// 2. Filter in-memory thay vì query nhiều lần
var filteredLocations = allLocations
    .Where(l => l.ProvinceId == targetProvinceId)
    .Where(l => l.Score >= 0)
    .Where(l => IsTagMatch(l, favoriteTags))
    .ToList();

// 3. Parallel processing cho independent tasks
var tasks = destinations.Select(dest => 
    BuildDayItineraryAsync(dest, ...)
).ToList();

var dailyItineraries = await Task.WhenAll(tasks);
```

---

## 📋 Tổng Kết

### Các Công Thức Quan Trọng

| Yếu Tố | Công Thức | Ghi Chú |
|--------|-----------|---------|
| **Contingency %** | `5-20%` tùy budget | Budget cao → % thấp |
| **Haversine Distance** | `6371 × 2 × atan2(√a, √(1-a))` | km |
| **Location Score** | `40% Quality + 35% Time + 25% Cost` | Composite |
| **Time Efficiency** | `100 - (stayDuration - 30) / 3` | Ưu tiên ngắn |
| **Cost Efficiency** | `100 - averageBudget / 5000` | Ưu tiên rẻ |
| **Hotel Score** | `25% Dist + 35% Budget + 25% Group + 15% Amenities` | |
| **Daily Weight** | `1.3 (day 1), 1.1 (day 2), 1.2 (last day)` | |
| **Limit/Floor** | `weightedBudget × 1.3 / × 0.7` | |
| **Rollover** | `Min(limit - spent, nextDayLimit × 0.5)` | Cap 50% |

### Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  VALIDATION & DATA LOADING (Database)                      │
│  - Provinces, Locations, Tags, TransportModes, TransitHubs │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  SCORING & FILTERING (In-Memory)                           │
│  - Tag Matching, Composite Score, Accommodation Split      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  ROUTING & DAY ALLOCATION (Greedy Algorithms)              │
│  - Nearest Neighbor, Largest Remainder                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  BUDGET DECOMPOSITION                                      │
│  - Contingency, Transport, Hotel, Activity                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  INTER-CITY TRANSPORT (External API + Fallback)            │
│  - Bus API, Flight API, Train API                          │
│  - Haversine Distance, Bracket Pricing                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  DAILY SCHEDULING (Greedy Activity Picker)                 │
│  - PickNextAttraction, Local Transport, Accommodation      │
│  - OSRM Routing, Opening Hours Check                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  OUTPUT ASSEMBLY (SmartItineraryDto)                       │
│  - Timeline, Budget Summary, Transport Options             │
└─────────────────────────────────────────────────────────────┘
```

---

*Tài liệu này tổng hợp từ 3 nguồn: `al.txt`, `algorithm_analysis.md`, `Algorythm.md`*
