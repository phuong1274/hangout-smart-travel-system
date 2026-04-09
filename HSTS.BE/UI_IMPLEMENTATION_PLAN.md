# 📋 Kế Hoạch Chi Tiết: Giao Diện Hệ Thống Lên Lịch Trình Du Lịch

> Tài liệu này mô tả chi tiết các API cần phát triển, dropdown lists, và cấu trúc UI cho tính năng tạo & hiển thị lịch trình du lịch dựa trên thuật toán scheduling hiện có.

---

## Mục Lục

1. [Tổng Quan Thuật Toán](#1-tổng-quan-thuật-toán)
2. [Các Màn Hình Cần Thiết](#2-các-màn-hình-cần-thiết)
3. [Dropdown Lists & Input Components](#3-dropdown-lists--input-components)
4. [API Mới Cần Phát Triển](#4-api-mới-cần-phát-triển)
5. [API Đã Tồn Tại](#5-api-đã-tồn-tại)
6. [Chi Tiết Từng Màn Hình](#6-chi-tiết-từng-màn-hình)
7. [Workflow Tích Hợp](#7-workflow-tích-hợp)
8. [Data Mapping Cho Timeline Items](#8-data-mapping-cho-timeline-items)
9. [Danh Sách File Liên Quan](#9-danh-sách-file-liên-quan)

---

## 1. Tổng Quan Thuật Toán

### 1.1 Input: `TripPlanRequest`

| Tham số | Kiểu | Mô tả | Validation |
|---------|------|-------|------------|
| `UserLocation` | `UserLocation` (Latitude, Longitude) | Điểm xuất phát của người dùng | Required, Lat: [-90,90], Lng: [-180,180] |
| `Destinations` | `List<DestinationRequest>` | Danh sách tỉnh/thành phố muốn đi (mỗi item có `ProvinceId` và optional `DistrictIds`) | ≥ 1 destination |
| `UserFavoriteTagIds` | `List<int>` | Các tag sở thích (dùng để scoring) | Optional |
| `CurrencyCode` | `string` | Mã tiền tệ (VD: "VND", "USD") | Required, max 5 ký tự | Nhập hoặc thả drop down list mặc định cho nó chọn
| `GroupSize` | `int` | Số người đi | > 0 |
| `MinimumAge` | `int` | Tuổi nhỏ nhất trong đoàn (lọc địa điểm phù hợp) | ≥ 0 |
| `TotalBudget` | `decimal` | Tổng ngân sách (VND) | > 0 |
| `StartDate` | `DateOnly` | Ngày bắt đầu | Required |
| `EndDate` | `DateOnly` | Ngày kết thúc | ≥ StartDate |
| `HotelPreference` | `string?` | null / "Budget" / "Standard" / "Luxury" | Optional |
| `TripSegment` | `string` | "Budget" / "Standard" / "Luxury" | Required |

### 1.2 Output: `GeneratedItineraryDto`

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `UserLocation` | `UserLocation` | Echo back input |
| `Destinations` | `List<DestinationRequest>` | Echo back input |
| `StartDate` / `EndDate` | `DateOnly` | Echo back input |
| `GroupSize` | `int` | Echo back input |
| `CurrencyCode` | `string` | Currency đã resolve |
| `BudgetLevel` | `string` | "Budget" / "Standard" / "Luxury" |
| `BudgetSummary` | `BudgetSummaryDto` | Phân tích chi phí đầy đủ |
| `Days` | `IList<ItineraryDayDto>` | Lịch trình từng ngày |
| `Notes` | `IList<string>` | Ghi chú / gợi ý từ thuật toán |

### 1.3 BudgetSummaryDto

| Field | Kiểu |
|-------|------|
| `TotalBudget` | `MoneyDto` |
| `ContingencyFund` | `MoneyDto` |
| `UsableBudget` | `MoneyDto` |
| `EstimatedTransportCost` | `MoneyDto` |
| `EstimatedAccommodationCost` | `MoneyDto` |
| `EstimatedActivityCost` | `MoneyDto` |
| `EstimatedTotalCost` | `MoneyDto` |
| `RemainingBudget` | `MoneyDto` |

### 1.4 ItineraryDayDto

| Field | Kiểu |
|-------|------|
| `DayNumber` | `int` |
| `DayTitle` | `string` |
| `Date` | `DateOnly` |
| `ProvinceId` | `int` |
| `WeatherSummary` | `string?` |
| `DailyBudget` | `MoneyDto` |
| `EstimatedDayCost` | `MoneyDto` |
| `RolloverToNextDay` | `MoneyDto` |
| `AccommodationRecommendations` | `IList<AccommodationRecommendationDto>?` |
| `Timeline` | `IList<ItineraryTimelineItemDto>` |

### 1.5 ItineraryTimelineItemDto

| Field | Kiểu |
|-------|------|
| `EventType` | `string` ("travel", "visit", "meal", "check-in", "check-out", "luggage-refresh") |
| `Title` | `string` |
| `StartTime` / `EndTime` | `TimeOnly` |
| `LocationId` | `int` |
| `LocationTypeId` | `int` |
| `TagIds` | `IList<int>` |
| `TicketCost` | `MoneyDto?` |
| `ExtraCostPerPerson` | `MoneyDto?` |
| `CostForGroup` | `MoneyDto?` |
| `Note` | `string` |
| `LocationToLocationTravel` | `LocationToLocationTravelLegDto?` |
| `TransitHubToLocationTravel` | `TransitHubToLocationTravelLegDto?` |
| `LocationToTransitHubTravel` | `LocationToTransitHubTravelLegDto?` |
| `Alternatives` | `IList<AlternativeLocationDto>?` |

---

## 2. Các Màn Hình Cần Thiết

| # | Màn hình | Mục đích |
|---|----------|----------|
| 1 | **Preference form** (Create Trip Plan) | Form nhập input cho thuật toán `POST/api/Itineraries/generate` |
| 2 | **Kết quả lịch trình** (Itinerary Output) | Hiển thị output từ `GeneratedItineraryDto` |
| 3 | **Chi tiết địa điểm** (Location Detail ) | Hiển thị thông tin chi tiết của từng `LocationId` trong timeline |
| 4 | **Chi tiết phương tiện** (Transport Detail ) | Hiển thị thông tin di chuyển giữa các điểm |
| 5 | **Chi tiết khách sạn** (Accommodation Detail) | Hiển thị thông tin khách sạn được gợi ý |

---

## 3. Dropdown Lists & Input Components

### 3.1 Dropdown Lists

| Component | API Endpoint | Method | Dữ liệu trả về | Ghi chú |
|-----------|-------------|--------|----------------|---------|
| **Tỉnh/Thành phố** | `/api/common/provinces` | GET | `[{id, name, code, countryId}]` | Dropdown chính để chọn destination |
| **Quận/Huyện** | `/api/common/districts` | GET | `[{id, name, provinceId}]` | Filter theo provinceId (⚠️ Cần API mới để filter) |
| **Tags sở thích (Root)** | `/api/tags/root` | GET | `[{id, name, parentTagId}]` | Parent tags cấp 1 |
| **Tags sở thích (Child)** | `/api/tags/parent/{parentTagId}` | GET | `[{id, name, parentTagId}]` | Child tags theo parent |

### 3.2 Input Fields

| Field | Component Type | Validation | Giá trị mặc định |
|-------|---------------|------------|-----------------|
| **User Location (Lat/Lng)** | Map picker / GPS input | Lat: [-90,90], Lng: [-180,180] | Current location (nếu có) |
| **Destinations (Provinces)** | Multi-select dropdown với tags | ≥ 1 province | - |
| **Districts** | Multi-select checkboxes (conditional theo province) | Optional | All districts |
| **Favorite Tags** | Multi-select tree checkboxes | Optional | - |
| **Group Size** | Number input (stepper) | > 0 | 1 |
| **Minimum Age** | Number input | ≥ 0 | 0 |
| **Total Budget** | Currency input with formatting | > 0 | - |
| **Start Date** | Date picker (calendar) | ≤ EndDate | Today |
| **End Date** | Date picker (calendar) | ≥ StartDate | StartDate + 1 |
| **Hotel Preference** | Radio buttons / Segmented control | null / Budget / Standard / Luxury | Standard |
| **Trip Segment** | Radio buttons / Segmented control | Budget / Standard / Luxury | Standard |
| **Currency Code** | Dropdown select | Max 5 ký tự | VND |Tự nhập/Chọn từ list( Validate code, hardcode ở FE)

### 3.3 Computed / Derived Fields

| Field | Cách tính | Hiển thị |
|-------|-----------|----------|
| **Số ngày** | `EndDate - StartDate + 1` | "X days, Y nights" |
| **Ngân sách/người** | `TotalBudget / GroupSize` | "X VND per person" |
| **Ngân sách/ngày** | `TotalBudget / Số ngày` | "X VND per day" |

---

## 4. API Mới Cần Phát Triển

### API 2: Get All Provinces
GET /api/provinces

Mục đích: Lấy danh sách tất cả các tỉnh/thành phố để dùng cho dropdown filter cho district.

Response
[
  {
    "id": 1,
    "name": "Hà Nội",
    "code": "HN"
  },
  {
    "id": 2,
    "name": "Hồ Chí Minh",
    "code": "HCM"
  },
  {
    "id": 3,
    "name": "Đà Nẵng",
    "code": "DN"
  }
]
Cần phát triển:
🧠 Application Layer
GetAllProvincesQuery.cs (MediatR Query)
GetAllProvincesQueryHandler.cs
ProvinceDto.cs (nếu chưa có)
🌐 API Layer
Endpoint trong:
ProvincesController.cs

### API 2: Get Districts by Province

```
GET /api/provinces/{provinceId}/districts
```

**Mục đích:** Lấy danh sách quận/huyện thuộc một tỉnh để filter trong form.

**Query Parameters:**
| Param | Type | Required | Default |
|-------|------|----------|---------|
| `provinceId` | `int` | ✅ Yes | - |

**Response:**
```json
[
  {
    "id": 1,
    "name": "Quận 1",
    "code": "Q1",
    "provinceId": 79
  },
  {
    "id": 2,
    "name": "Quận 3",
    "code": "Q3",
    "provinceId": 79
  }
]
```

**Cần phát triển:**
- Application: `GetDistrictsByProvinceQuery.cs` (MediatR Query)
- Application: `DistrictDto.cs` (nếu chưa có)
- API: Endpoint trong `CommonController` hoặc `DistrictsController`


### API 4: Get Locations Batch Details (optional)

```
POST /api/locations/batch
Content-Type: application/json

{
  "locationIds": [101, 102, 105, 203]
}
```

**Mục đích:** Fetch chi tiết nhiều locations cùng lúc (performance optimization thay vì gọi N requests riêng lẻ).

**Request Body:**
```json
{
  "locationIds": [101, 102, 105, 203],
  "referenceDate": "2026-04-05" // Optional, để check opening hours
}
```

**Response:**
```json
[
  {
    "id": 101,
    "name": "Chợ Bến Thành",
    "description": "Chợ Bến Thành là một trong những chợ lớn nhất...",
    "address": "Lê Lợi, Bến Thành, Quận 1",
    "latitude": 10.7725,
    "longitude": 106.6980,
    "locationTypeId": 3,
    "locationTypeName": "Shopping",
    "districtId": 1,
    "districtName": "Quận 1",
    "provinceId": 79,
    "provinceName": "TP. Hồ Chí Minh",
    "ticketPrice": 0,
    "priceMinUsd": null,
    "priceMaxUsd": null,
    "recommendedDurationMinutes": 120,
    "score": 4.5,
    "minimumAge": 0,
    "openingHours": [
      { "dayOfWeek": 1, "openTime": "06:00", "closeTime": "18:00" },
      { "dayOfWeek": 2, "openTime": "06:00", "closeTime": "18:00" }
    ],
    "tags": [
      { "id": 1, "name": "Shopping" },
      { "id": 5, "name": "Văn hóa địa phương" }
    ],
    "amenities": [
      { "id": 10, "name": "Bãi đỗ xe" },
      { "id": 11, "name": "Nhà hàng" }
    ],
    "images": [
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg"
    ],
    "socialLinks": {
      "website": "https://example.com",
      "facebook": "https://facebook.com/example"
    },
    "isCurrentlyOpen": true,
    "closures": [
      { "fromDate": "2026-01-01", "toDate": "2026-01-01", "reason": "Tết Nguyên Đán" }
    ]
  }
]
```

**Cần phát triển:**
- Application: `GetLocationsBatchQuery.cs`
- API: Endpoint trong `LocationsController`



## 5. API Đã Tồn Tại

| # | API Endpoint | Method | Mục đích | Trạng thái |
|---|-------------|--------|----------|------------|
| 1 | `/api/itineraries/generate` | POST | Generate lịch trình từ TripPlanRequest | ✅ Sẵn sàng |
| 2 | `/api/itineraries/sandbox-transport-options` | GET | Tìm kiếm phương tiện liên tỉnh | ✅ Sẵn sàng |
| 3 | `/api/locations/{id}` | GET | Chi tiết 1 địa điểm | ✅ Sẵn sàng |
| 4 | `/api/locations?searchTerm=&pageIndex=&pageSize=` | GET | Tìm kiếm địa điểm (phân trang) | ✅ Sẵn sàng |
| 5 | `/api/common/tags` | GET | Tất cả tags | ✅ Sẵn sàng |
| 6 | `/api/tags/root` | GET | Root tags (level 1) | ✅ Sẵn sàng |
| 7 | `/api/tags/parent/{parentTagId}` | GET | Child tags theo parent | ✅ Sẵn sàng |
| 8 | `/api/common/location-types` | GET | Loại địa điểm | ✅ Sẵn sàng |
| 9 | `/api/common/amenities` | GET | Tiện ích | ✅ Sẵn sàng |
| 10 | `/api/common/provinces` | GET | Tất cả tỉnh/thành | ✅ Sẵn sàng |
| 11 | `/api/locations/provinces?countryId={id}` | GET | Tỉnh theo quốc gia | ✅ Sẵn sàng |
| 12 | `/api/common/districts` | GET | Tất cả quận/huyện | ✅ Sẵn sàng |
| 13 | `/api/locations/countries` | GET | Tất cả quốc gia | ✅ Sẵn sàng |

---

## 6. Chi Tiết Từng Màn Hình

### 6.1 Màn hình "Tạo lịch trình" (Create Trip Plan)

**Route:** `/create-trip`

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  🗺️ TẠO LỊCH TRÌNH DU LỊCH                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📍 Điểm xuất phát                                       │
│  ┌────────────────────────────────────────────┐         │
│  │  [🗺️ Bản đồ tương tác - chọn điểm]         │         │
│  │  Hoặc nhập tọa độ:                          │         │
│  │  Latitude:  [10.7725]  Longitude: [106.6980]│        │
│  │  [📍 Sử dụng vị trí hiện tại]               │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  🏖️ Điểm đến                                             │
│  ┌────────────────────────────────────────────┐         │
│  │  Tỉnh/Thành phố: [Chọn tỉnh ▼] [Thêm +]    │         │
│  │                                             │         │
│  │  Đã chọn:                                   │         │
│  │  ┌──────────────────────────────────────┐  │         │
│  │  │ ✓ TP. Hồ Chí Minh          [✕ Xóa]   │  │         │
│  │  │   Quận/Huyện:                        │  │         │
│  │  │   [☑ Tất cả] [☐ Q1] [☐ Q3] [☐ Q5]   │  │         │
│  │  │                                      │  │         │
│  │  │ ✓ Đà Nẵng                  [✕ Xóa]   │  │         │
│  │  │   Quận/Huyện: [☑ Tất cả]             │  │         │
│  │  └──────────────────────────────────────┘  │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  🏷️ Sở thích của bạn                                     │
│  ┌────────────────────────────────────────────┐         │
│  │  [☑ 🏖️ Biển]       [☑ 🏛️ Văn hóa]          │         │
│  │  [☑ 🍜 Ẩm thực]    [☑ 🎮 Giải trí]         │         │
│  │  [☑ 🛍️ Mua sắm]    [☑ 🌿 Thiên nhiên]      │         │
│  │  [☑ 🏔️ Leo núi]    [☑ 🌃 Đêm]              │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  👥 Thông tin đoàn                                        │
│  Số người:  [🔽 2 🔼] người                             │
│  Tuổi nhỏ nhất: [0] tuổi                                │
│                                                          │
│  💰 Ngân sách                                            │
│  Tổng ngân sách: [5,000,000] [VND ▼]                    │
│  ≈ 2,500,000 VND/người                                   │
│                                                          │
│  📅 Thời gian                                            │
│  Ngày đi:  [📅 2026-04-05]                               │
│  Ngày về:  [📅 2026-04-07]                               │
│  → 3 ngày 2 đêm                                          │
│                                                          │
│  🏨 Tùy chọn lưu trú                                      │
│  ┌────────────────────────────────────────────┐         │
│  │  Khách sạn:                                │         │
│  │  ○ 💰 Budget (Giá rẻ)                      │         │
│  │  ● ⭐ Standard (Tiêu chuẩn)                 │         │
│  │  ○ 💎 Luxury (Cao cấp)                     │         │
│  │                                             │         │
│  │  Phân khúc chuyến đi:                       │         │
│  │  ○ 💰 Budget  ● ⭐ Standard  ○ 💎 Luxury    │         │
│  └────────────────────────────────────────────┘         │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│         [🚀 TẠO LỊCH TRÌNH]                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Form Validation:**

| Rule | Message |
|------|---------|
| UserLocation required | "Vui lòng chọn điểm xuất phát" |
| Lat trong [-90, 90] | "Vĩ độ không hợp lệ" |
| Lng trong [-180, 180] | "Kinh độ không hợp lệ" |
| Destinations not empty | "Vui lòng chọn ít nhất 1 điểm đến" |
| EndDate >= StartDate | "Ngày về phải sau ngày đi" |
| GroupSize > 0 | "Số người phải lớn hơn 0" |
| MinimumAge >= 0 | "Tuổi không hợp lệ" |
| TotalBudget > 0 | "Ngân sách phải lớn hơn 0" |
| HotelPreference valid | "Loại khách sạn không hợp lệ" |
| TripSegment valid | "Phân khúc không hợp lệ" |

---

### 6.2 Màn hình "Kết quả lịch trình" (Itinerary Output)

**Route:** `/itinerary/{tripId}` hoặc `/itinerary?requestId={id}`

**Layout:**

```
┌────────────────────────────────────────────────────────────────────┐
│  📋 KẾT QUẢ LỊCH TRÌNH DU LỊCH                                     │
│  TP.HCM → Đà Nẵng | 05/04 - 07/04/2026 | 2 người | Standard       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─ TAB NAVIGATION ──────────────────────────────────────────┐    │
│  │ [📅 Lịch trình] [💰 Ngân sách] [🗺️ Bản đồ] [📥 Xuất PDF] │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ── TAB: LỊCH TRÌNH ─────────────────────────────────────────    │
│                                                                    │
│  💰 TÓM TẮT NGÂN SÁCH                                             │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  Tổng ngân sách:          5,000,000 VND              │        │
│  │  Dự phòng (10%):         -500,000 VND                │        │
│  │  Ngân sách khả dụng:      4,500,000 VND              │        │
│  │  ──────────────────────────────────────              │        │
│  │  Di chuyển:              -1,200,000 VND              │        │
│  │  Lưu trú:                -1,500,000 VND              │        │
│  │  Hoạt động:              -1,300,000 VND              │        │
│  │  ──────────────────────────────────────              │        │
│  │  Tổng dự kiến:            4,000,000 VND              │        │
│  │  Còn lại:                 500,000 VND ✓               │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  📅 NGÀY 1 - Chủ Nhật, 05/04/2026                                 │
│  📍 TP. Hồ Chí Minh | ☀️ Nắng đẹp, 32°C                            │
│                                                                    │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  ⏰     Hoạt động                    Cost    Time     │        │
│  │  ─────────────────────────────────────────────────── │        │
│  │  06:30  🚗 Bắt đầu hành trình                        │        │
│  │                                                        │        │
│  │  07:00  🏛️ Chợ Bến Thành             Free     2h     │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │         Tags: Shopping, Văn hóa                       │        │
│  │         💡 Gợi ý: Chợ lớn nhất TP.HCM                │        │
│  │                                                        │        │
│  │  09:30  ☕ Cafe Apartments            50,000   1h     │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │         Tags: Cafe, Kiến trúc                         │        │
│  │                                                        │        │
│  │  11:30  🍜 Ăn trưa - Phở Hòa         80,000   1.5h   │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │         Tags: Ẩm thực địa phương                      │        │
│  │                                                        │        │
│  │  13:30  🛍️ Diamond Plaza              Free     2h     │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │                                                        │        │
│  │  18:00  🍽️ Ăn tối - Quán An          150,000  2h     │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │                                                        │        │
│  │  20:00  🏨 Check-in Liberty Central  750,000/đêm      │        │
│  │         [👁 Xem khách sạn]                             │        │
│  │                                                        │        │
│  │  ─────────────────────────────────────────             │        │
│  │  Ngân sách ngày:    2,000,000 VND                     │        │
│  │  Dự kiến chi:       1,800,000 VND ✓                   │        │
│  │  Dư:                  200,000 VND → chuyển ngày sau   │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  📅 NGÀY 2 - Thứ Hai, 06/04/2026                                  │
│  📍 Đà Nẵng | ⛅ Nhiều mây, 30°C                                   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  06:30  🚌 Xe buýt TP.HCM → Đà Nẵng  300,000  5h    │        │
│  │         [👁 Xem chi tiết phương tiện]                 │        │
│  │         Bến xe Miền Đông → Bến xe Đà Nẵng            │        │
│  │                                                        │        │
│  │  12:00  🏖️ Biển Mỹ Khê                Free     2h     │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │                                                        │        │
│  │  15:00  🏛️ Bảo tàng Chăm              50,000   1.5h   │        │
│  │         [👁 Xem chi tiết] [🗺️ Bản đồ]                 │        │
│  │                                                        │        │
│  │  ... (tiếp tục)                                        │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  📅 NGÀY 3 - Thứ Ba, 07/04/2026                                   │
│  📍 Đà Nẵng → Về TP.HCM | ☀️ Nắng đẹp, 31°C                        │
│                                                                    │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  07:00  🏨 Check-out khách sạn                       │        │
│  │  08:00  🏖️ Công viên Biển Đông       Free     1.5h   │        │
│  │  10:00  🛍️ Chợ Hàn                   Free     1h     │        │
│  │  12:00  🍜 Ăn trưa                  100,000  1.5h    │        │
│  │  14:00  🚌 Về TP.HCM                 300,000  5h     │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                    │
│  ─────────────────────────────────────────────────────────────   │
│                                                                    │
│  📝 GHI CHÚ TỪ HỆ THỐNG                                           │
│  ┌──────────────────────────────────────────────────────┐        │
│  │  • Ngày 1 trời nắng đẹp, phù hợp hoạt động ngoài trời│        │
│  │  • Ngày 2 có mây, nên ưu tiên hoạt động trong nhà    │        │
│  │  • Ngân sách dự phòng 10% đã được tính toán          │        │
│  │  • Có thể thay đổi hoạt động nếu thời tiết xấu       │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│  [🔄 Tạo lại] [✏️ Chỉnh sửa] [📥 Xuất PDF] [💾 Lưu lịch trình]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### 6.3 Màn hình "Chi tiết địa điểm" (Location Detail Modal)

**Trigger:** Click "[👁 Xem chi tiết]" trong timeline

**Layout:**

```
┌──────────────────────────────────────────────────────┐
│  🏛️ Chợ Bến Thành                           [✕ Đóng] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ Image Gallery ───────────────────────────────┐  │
│  │  ┌─────────────────────────────┐               │  │
│  │  │                             │               │  │
│  │  │     📷 Ảnh chính            │               │  │
│  │  │                             │               │  │
│  │  └─────────────────────────────┘               │  │
│  │  [📷] [📷] [📷] [📷] [📷] [+3]                 │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ── Thông tin cơ bản ─────────────────────────────  │
│  📍 Địa chỉ: Lê Lợi, Bến Thành, Quận 1, TP.HCM      │
│  🏷️ Danh mục: Shopping / Chợ                        │
│  ⭐ Đánh giá: 4.5/5 (1,250 lượt)                     │
│  🎫 Vé vào: Miễn phí                                 │
│  ⏱️ Thời gian gợi ý: 2 giờ                           │
│  👤 Tuổi tối thiểu: Không yêu cầu                    │
│                                                      │
│  ── Giờ mở cửa ───────────────────────────────────  │
│  ┌──────────────────────────────────────┐           │
│  │  Thứ 2 - Thứ 6:  06:00 - 18:00      │           │
│  │  Thứ 7:          06:00 - 19:00      │           │
│  │  Chủ nhật:       06:00 - 19:00      │           │
│  │  ⚠️ Đóng cửa: 01/01 (Tết Nguyên Đán)│           │
│  └──────────────────────────────────────┘           │
│  ✅ Hiện đang mở cửa                                 │
│                                                      │
│  ── Chi phí ──────────────────────────────────────  │
│  💰 Vé: Miễn phí                                    │
│  💰 Chi phí thêm: ~50,000 VND/người                 │
│  💰 Chi phí nhóm (2 người): 100,000 VND             │
│                                                      │      │
│                                                      │
│  ── Tiện ích ─────────────────────────────────────  │
│  ✅ Bãi đỗ xe   ✅ Nhà hàng   ✅ WiFi               │
│  ✅ ATM   ✅ Nhà vệ sinh                             │
│                                                      │
│  ── Mô tả ────────────────────────────────────────  │
│  Chợ Bến Thành là một trong những chợ lớn nhất      │
│  và nổi tiếng nhất tại TP. Hồ Chí Minh. Với hơn     │
│  100 năm lịch sử, chợ là điểm đến lý tưởng để       │
│  mua sắm đặc sản, quà lưu niệm và thưởng thức       │
│  ẩm thực địa phương...                               │
│                                                      │
│  ── Di chuyển ────────────────────────────────────  │
│  🚗 Cách điểm trước: 2.5km (12 phút)                 │
│  🚌 Xe buýt: Tuyến 01, 04 (dừng cách 200m)          │
│                                                      │
│  ── Thời tiết ngày tham quan ─────────────────────  │
│  ☀️ Nắng đẹp, 32°C, độ ẩm 65%                        │
│  💡 Khuyến nghị: Mang theo kem chống nắng            │
│                                                      │
│  ── Địa điểm thay thế ────────────────────────────  │
│  💡 Nếu bạn không thể đến đây, thử:                  │
│  • Chợ Bình Tây (3.2km) - [Xem chi tiết]            │
│  • Saigon Square (1.5km) - [Xem chi tiết]           │
│                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  [🗺️ Xem trên bản đồ] [📋 Thêm vào kế hoạch]        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### 6.4 Màn hình "Chi tiết phương tiện" (Transport Detail Modal)

**Trigger:** Click "[👁 Xem chi tiết phương tiện]" trong timeline

**Layout:**

```
┌──────────────────────────────────────────────────────┐
│  🚌 Di chuyển liên tỉnh                     [✕ Đóng] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ── Tuyến đường ──────────────────────────────────  │
│  📍 Bến xe Miền Đông → 📍 Bến xe Đà Nẵng            │                           │
│  🕐 Giờ đi:     06:30                                │
│  🕐 Giờ đến:    11:30                                │
│  ⏱️ Thời gian:  5 giờ                                │
│  📏 Khoảng cách: 960 km                               │
│                                                      │
│  ── Giá vé ───────────────────────────────────────  │
│  💰 Giá/người: 300,000 VND                           │
│  💰 Tổng nhóm (2 người): 600,000 VND                 │      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### 6.5 Màn hình "Chi tiết khách sạn" (Accommodation Detail Modal)

**Trigger:** Click "[👁 Xem khách sạn]" trong timeline

**Layout:**

```
┌──────────────────────────────────────────────────────┐
│  🏨 Liberty Central Hotel                   [✕ Đóng] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─ Image Gallery ───────────────────────────────┐  │
│  │  [📷 Ảnh đại sảnh] [📷 Phòng] [📷 Hồ bơi]      │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ⭐⭐⭐⭐ 4.0/5 (1,250 reviews)                         │
│  📍 17 Pasteur, Bến Nghé, Quận 1, TP.HCM            │                         │
│                                                      │
│  ── Giá phòng ────────────────────────────────────  │
│  💰 Giá/phòng/đêm: 1,500,000 VND                    │
│  💰 Giá/người/đêm: 750,000 VND (cho 2 người)        │
│  💰 Tổng chi phí (2 đêm): 3,000,000 VND             │
│                                                      │
│  ── Tiện nghi ────────────────────────────────────  │
│  ✅ WiFi   ✅ Hồ bơi   ✅ Bữa sáng                   │
│  ✅ Lễ tân 24h   ✅ Gym   ✅ Spa                     │
│  ✅ Bãi đỗ xe   ✅ Nhà hàng                          │
                                 │                │
│                                                      │
│  ── Mô tả ────────────────────────────────────────  │
│  Khách sạn 4 sao nằm ở vị trí trung tâm, gần       │
│  chợ Bến Thành và phố đi bộ Nguyễn Huệ...           │
│                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│  [🗺️ Xem trên bản đồ] [🏨 Đặt phòng]                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 7. Workflow Tích Hợp

### 7.1 Flow hoàn chỉnh

```
┌─────────────────────────────────────────────────────────────────┐
│                        WORKFLOW HỆ THỐNG                         │
└─────────────────────────────────────────────────────────────────┘

1️⃣  User vào /create-trip
    │
    ├─── Load dropdown data (parallel):
    │    ├── GET /api/common/provinces           → Danh sách tỉnh
    │    ├── GET /api/common/districts           → Danh sách quận
    │    ├── GET /api/tags/root                  → Root tags
    │    ├── GET /api/common/location-types      → Loại địa điểm
    │    └── GET /api/common/amenities           → Tiện ích
    │
2️⃣  User tương tác form:
    │    ├── Chọn tỉnh → Trigger GET /api/common/provinces/{id}/districts [NEW]
    │    │              → Hiển thị districts tương ứng
    │    ├── Chọn parent tag → Trigger GET /api/tags/parent/{id}
    │    │                   → Hiển thị child tags
    │    └── Chọn vị trí trên map → Set Lat/Lng
    │
3️⃣  User submit form
    │    ├── Validate client-side
    │    └── POST /api/itineraries/generate
    │        Body: { TripPlanRequest }
    │
4️⃣  Loading screen
    │    ├── Show progress indicator
    │    ├── Estimated time: 5-30 seconds
    │    └── Display tips / fun facts
    │
5️⃣  Nhận response: GeneratedItineraryDto
    │
6️⃣  Hiển thị lịch trình:
    │    ├── Parse BudgetSummaryDto → Budget overview
    │    ├── Parse Days[] → Day-by-day cards
    │    └── Parse Timeline[] → Timeline items
    │
7️⃣  Fetch location details (batch):
    │    ├── Collect all LocationIds from timeline
    │    └── POST /api/locations/batch [NEW]
    │        Body: { locationIds: [...] }
    │        → Cache results for modal display
    │
    │
🔟  User actions:
     ├── Click timeline item → Show Location Detail Modal
     ├── Click transport → Show Transport Detail Modal
     ├── Click hotel → Show Accommodation Detail Modal
     ├── Click [🗺️ Bản đồ] → Show map view with route
     ├── Click [📥 Xuất PDF] → Generate & download PDF
     ├── Click [🔄 Tạo lại] → Back to step 2 với params khác
     └── Click [💾 Lưu] → Save itinerary to DB [FUTURE]
```

---

## 8. Data Mapping Cho Timeline Items

### 8.1 Timeline Item → Data cần hiển thị

Mỗi `ItineraryTimelineItemDto` có các field cơ bản. Để hiển thị chi tiết trên UI, cần fetch thêm từ các nguồn sau:

| Field trong UI | Nguồn dữ liệu | API cần gọi |
|----------------|---------------|-------------|
| **Location Name** | `Location.Name` | `POST /api/locations/batch` |
| **Description** | `Location.Description` | `POST /api/locations/batch` |
| **Address** | `Location.Address` + District + Province | `POST /api/locations/batch` |
| **Images** | `LocationMedia` (linked table) | `POST /api/locations/batch` |
| **Opening Hours** | `LocationOpeningHour` | `POST /api/locations/batch` |
| **Tags** | `Tag` (qua `LocationTag`) | `POST /api/locations/batch` |
| **Amenities** | `Amenity` (qua `LocationAmenity`) | `POST /api/locations/batch` |
| **Ticket Price** | `Location.TicketPrice` | Đã có trong DTO (`TicketCost`) |
| **Extra Cost** | Từ Location hoặc DTO | Đã có trong DTO (`ExtraCostPerPerson`) |
| **Group Cost** | Tính từ DTO | Đã có trong DTO (`CostForGroup`) |
| **Weather** | External Weather API | `GET /api/weather/forecast` |
| **Distance từ điểm trước** | Route Matrix Service | `GET /api/routes/matrix` |
| **Alternatives** | Từ algorithm output | Đã có trong DTO (`Alternatives`) |
| **Transport details** | Intercity Transport Service | `GET /api/itineraries/sandbox-transport-options` |

### 8.2 EventType → Icon Mapping

| EventType | Icon | Màu | Ghi chú |
|-----------|------|-----|---------|
| `travel` | 🚌 / 🚗 / ✈️ | `#3B82F6` (Blue) | Di chuyển |
| `visit` | 🏛️ / 🏖️ / 🌿 | `#10B981` (Green) | Tham quan |
| `meal` | 🍜 / 🍽️ | `#F59E0B` (Orange) | Ăn uống |
| `check-in` | 🏨📥 | `#8B5CF6` (Purple) | Nhận phòng |
| `check-out` | 🏨📤 | `#6B7280` (Gray) | Trả phòng |
| `luggage-refresh` | 🧳 | `#EC4899` (Pink) | Gửi/lấy hành lý |

### 8.3 LocationTypeId → Default Icon

| Location Type | Icon | Ví dụ |
|---------------|------|-------|
| Attraction | 🏛️ | Bảo tàng, đền, chùa |
| Restaurant | 🍽️ | Nhà hàng, quán ăn |
| Shopping | 🛍️ | Chợ, trung tâm thương mại |
| Accommodation | 🏨 | Khách sạn, homestay |
| Entertainment | 🎮 | Rạp phim, công viên giải trí |
| Nature | 🌿 | Công viên, vườn quốc gia |
| Beach | 🏖️ | Bãi biển |
| Transit Hub | 🚌 | Bến xe, ga tàu |

---

## 9. Danh Sách File Liên Quan

### 9.1 Files hiện có (Backend)

| File | Đường dẫn |
|------|-----------|
| **Controller - Itineraries** | `HSTS.API/Controllers/ItinerariesController.cs` |
| **Algorithm Handler** | `HSTS.Application/Itineraries/Queries/GenerateItineraryQuery.cs` (~1891 lines) |
| **DTO - GeneratedItinerary** | `HSTS.Application/Itineraries/Queries/GeneratedItineraryDto.cs` |
| **DTO - ItineraryDay** | `HSTS.Application/Itineraries/Queries/ItineraryDayDto.cs` |
| **DTO - TimelineItem** | `HSTS.Application/Itineraries/Queries/ItineraryTimelineItemDto.cs` |
| **DTO - BudgetSummary** | `HSTS.Application/Itineraries/Queries/BudgetSummaryDto.cs` |
| **DTO - Money** | `HSTS.Application/Itineraries/Queries/MoneyDto.cs` |
| **DTO - Accommodation** | `HSTS.Application/Itineraries/Queries/AccommodationRecommendationDto.cs` |
| **DTO - AlternativeLocation** | `HSTS.Application/Itineraries/Queries/AlternativeLocationDto.cs` |
| **Controller - Locations** | `HSTS.API/Controllers/LocationsController.cs` |
| **Controller - Tags** | `HSTS.API/Controllers/TagsController.cs` |
| **Controller - Common** | `HSTS.API/Controllers/CommonController.cs` |
| **Entity - Location** | `HSTS.Domain/Entities/Location.cs` |
| **Entity - Province** | `HSTS.Domain/Entities/Province.cs` |
| **Entity - District** | `HSTS.Domain/Entities/District.cs` |
| **Entity - Tag** | `HSTS.Domain/Entities/Tag.cs` |
| **Entity - LocationType** | `HSTS.Domain/Entities/LocationType.cs` |
| **Entity - Amenity** | `HSTS.Domain/Entities/Amenity.cs` |
| **Service - RouteMatrix** | `HSTS.Infrastructure/Services/RouteMatrixService.cs` |
| **Service - WeatherAdvisory** | `HSTS.Infrastructure/Services/WeatherAdvisoryService.cs` |
| **Service - IntercityTransport** | `HSTS.Infrastructure/Services/FixedIntercityTransportService.cs` |
| **Service - Currency** | `HSTS.Infrastructure/Services/CurrencyService.cs` |

### 9.2 Files cần phát triển mới

| File cần tạo | Tầng | Mô tả |
|-------------|------|-------|
| `GetDistrictsByProvinceQuery.cs` | Application | Query lấy districts theo province |
| `GetLocationsBatchQuery.cs` | Application | Query batch location details |
| `LocationBatchDto.cs` | Application | DTO cho batch location response |
---

## 10. Thứ Tự Ưu Tiên Phát Triển

### Phase 1: Core Input/Output (Bắt buộc)

| # | Task | Estimated Effort |
|---|------|-----------------|
| 1 | `POST /api/locations/batch` | 2-3 hours |
| 2 | UI Form tạo lịch trình | 4-6 hours |
| 3 | UI Hiển thị kết quả lịch trình | 6-8 hours |

### Phase 2: Enhancement (Nên có)

| # | Task | Estimated Effort |
|---|------|-----------------|
| 5 | `GET /api/common/provinces/{id}/districts` | 1-2 hours |

### Phase 3: Polish (Nice to have)

| # | Task | Estimated Effort |
|---|------|-----------------|
| 11 | `POST /api/accommodations/batch` | 2-3 hours |
| 12 | Export PDF | 4-6 hours |
| 13 | Save itinerary to DB | 3-4 hours |
| 14 | Edit/Regenerate flow | 3-4 hours |

---

## 11. Ghi Chú Quan Trọng

### 11.1 Performance Considerations

- **Batch API** (`POST /api/locations/batch`) là bắt buộc để tránh N+1 query problem
- **Cache** location details trong session/localStorage để giảm API calls
- **Lazy load** images trong gallery
- **Virtual scroll** cho timeline dài (>20 items)
- F5 không được mất dữ liệu Itenerary được gen ra trên trang , do dữ liệu này chưa được save vào CSDL

### 11.2 Error Handling

| Error Case | Xử lý |
|------------|-------|
| Budget vượt quá | Hiển thị suggestions từ algorithm notes |
| Không có locations phù hợp | Fallback về all locations (đã có trong algorithm) |
| Weather API fail | Hiển thị "No weather data available" |
| Route Matrix fail | Fallback về distance tính bằng Haversine formula |
| Generate timeout (>60s) | Hiển thị error + suggestion giảm scope |

### 11.3 Security

- Rate limiting cho `/api/itineraries/generate` (tốn tài nguyên)
- Validate input coordinates để tránh injection
- Sanitize location names trước khi hiển thị

### 11.4 Future Extensions

- [ ] Save & share itinerary
- [ ] Collaborative editing (multi-user)
- [ ] Multi-language support

---

*Tài liệu này được tạo dựa trên phân tích codebase hiện tại. Cập nhật lần cuối: 2026-04-04*
