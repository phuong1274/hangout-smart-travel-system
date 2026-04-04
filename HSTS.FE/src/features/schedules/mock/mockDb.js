export const mockDb = {
  locations: {
    64: { 
      id: 64, 
      name: "Vietnam National Tuong Theatre", 
      address: "51A Duong Thanh Street, Cua Dong Ward, Hoan Kiem District, Hanoi, Vietnam", 
      ticketPrice: 0,
      images: [
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/18/ac/a2/ad/vietnam-national-tuong.jpg?w=700&h=400&s=1",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/19/9e/d5/0f/an-iconic-scene-from.jpg?w=700&h=400&s=1",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/19/9e/d5/0e/an-iconic-scene-from.jpg?w=700&h=400&s=1",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/28/e5/a9/3e/caption.jpg?w=800&h=400&s=1"
      ]
    },
    97: { 
      id: 97, 
      name: "Cafe Mai", 
      address: "52 Nguyen Du Street, Tran Hung Dao Ward, Cua Nam District, Hoan Kiem District, Hanoi, Vietnam", 
      ticketPrice: 0,
      images: [
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/1b/4c/27/a2/coffee-paris-mai.jpg?w=700&h=400&s=1",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/12/6f/e0/b0/photo2jpg.jpg?w=700&h=400&s=1",
        "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/10/5e/13/fb/photo0jpg.jpg?w=700&h=-1&s=1",
      ] 
    }
  },

  transitHubs: {
    5: { id: 5, name: "Noi Bai International Airport", code: "HAN" },
    12: { id: 12, name: "Vinh Airport", code: "VII" },
    103: { id: 103, name: "La Khe Station", code: "LAK" },
    114: { id: 114, name: "Chu Le Station", code: "CLE" }
  },

  provinces: {
    24: { id: 24, name: "Ha Noi", englishName: "Ha Noi" },
    25: { id: 25, name: "Ha Tinh", englishName: "Ha Tinh" }
  },

  tags: {
    213: { id: 213, name: "Theaters", color: "purple" },
    228: { id: 228, name: "Coffeehouses", color: "orange" }
  },

  transportMethods: {
    "4-seater taxi": { name: "4-seater taxi" },
    "7-seater taxi": { name: "7-seater taxi" },
    "Plane": { name: "Plane" },
    "Train": { name: "Train" }
  }
};