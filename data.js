// data.js
const stockData = [
  {
    symbol: "TATAMOTORS_CV",
    name: "Tata Motors CV",
    color: "#00E676", // Neon Green
    data: [450, 455, 452, 460, 465, 470, 468, 475, 480, 485]
  },
  {
    symbol: "TATAMOTORS_PV",
    name: "Tata Motors PV",
    color: "#2979FF", // Neon Blue
    data: [980, 990, 985, 1000, 1010, 1005, 1020, 1030, 1040, 1050]
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    color: "#FF1744", // Neon Red
    data: [3800, 3850, 3820, 3900, 3880, 3950, 4000, 3980, 4050, 4100]
  },
  {
    symbol: "INFY",
    name: "Infosys",
    color: "#FFEA00", // Neon Yellow
    data: [1400, 1420, 1410, 1450, 1480, 1470, 1500, 1520, 1550, 1600]
  },
  {
    symbol: "HCLTECH",
    name: "HCL Technologies",
    color: "#D500F9", // Neon Purple
    data: [1300, 1320, 1350, 1330, 1380, 1400, 1390, 1420, 1450, 1480]
  }
];

// Shared X-axis labels (mocked for recent days)
const labels = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7", "Day 8", "Day 9", "Today"];
