/**
 * ============================================================================
 * Data Initializer - Smart City Traffic Management System
 * ============================================================================
 * Initialise automatiquement les données de simulation:
 * - 10 Routes
 * - 50 Véhicules  
 * - 8 Intersections
 * - 50 Conducteurs
 * ============================================================================
 */

const { fabricService } = require('./fabric.service');
const { fabricConfig } = require('../config');
const { apiLogger: logger } = require('../utils/logger');

const TRAFFIC_REGISTRY = fabricConfig.chaincodes.trafficRegistry;
const ROAD_MANAGER = fabricConfig.chaincodes.roadManager;

// ============================================================================
// DONNÉES DE SIMULATION
// ============================================================================

// 10 Routes de la ville
const SIMULATION_ROADS = [
  { id: 'ROAD-001', name: 'Avenue Mohammed V', roadType: 'primary', lanes: 4, speedLimit: 50, length: 3.5, startPoint: { lat: 33.5731, lng: -7.5898 }, endPoint: { lat: 33.5831, lng: -7.5798 } },
  { id: 'ROAD-002', name: 'Boulevard Hassan II', roadType: 'highway', lanes: 6, speedLimit: 80, length: 8.2, startPoint: { lat: 33.5631, lng: -7.6098 }, endPoint: { lat: 33.5931, lng: -7.5598 } },
  { id: 'ROAD-003', name: 'Rue Allal Ben Abdellah', roadType: 'secondary', lanes: 2, speedLimit: 40, length: 1.8, startPoint: { lat: 33.5750, lng: -7.5850 }, endPoint: { lat: 33.5780, lng: -7.5820 } },
  { id: 'ROAD-004', name: 'Avenue des FAR', roadType: 'primary', lanes: 4, speedLimit: 60, length: 4.5, startPoint: { lat: 33.5700, lng: -7.6000 }, endPoint: { lat: 33.5900, lng: -7.5800 } },
  { id: 'ROAD-005', name: 'Boulevard Zerktouni', roadType: 'primary', lanes: 4, speedLimit: 50, length: 2.8, startPoint: { lat: 33.5800, lng: -7.6200 }, endPoint: { lat: 33.5850, lng: -7.6100 } },
  { id: 'ROAD-006', name: 'Rue Ibn Batouta', roadType: 'secondary', lanes: 2, speedLimit: 40, length: 1.2, startPoint: { lat: 33.5720, lng: -7.5950 }, endPoint: { lat: 33.5750, lng: -7.5920 } },
  { id: 'ROAD-007', name: 'Avenue Moulay Rachid', roadType: 'primary', lanes: 4, speedLimit: 50, length: 3.0, startPoint: { lat: 33.5650, lng: -7.5800 }, endPoint: { lat: 33.5750, lng: -7.5700 } },
  { id: 'ROAD-008', name: 'Boulevard Anfa', roadType: 'highway', lanes: 6, speedLimit: 70, length: 5.5, startPoint: { lat: 33.5900, lng: -7.6300 }, endPoint: { lat: 33.5600, lng: -7.6000 } },
  { id: 'ROAD-009', name: 'Rue de Paris', roadType: 'commercial', lanes: 2, speedLimit: 30, length: 0.8, startPoint: { lat: 33.5740, lng: -7.5880 }, endPoint: { lat: 33.5760, lng: -7.5860 } },
  { id: 'ROAD-010', name: 'Avenue Mers Sultan', roadType: 'primary', lanes: 4, speedLimit: 50, length: 2.5, startPoint: { lat: 33.5780, lng: -7.5950 }, endPoint: { lat: 33.5820, lng: -7.5900 } },
];

// 50 Véhicules pour la simulation
const SIMULATION_VEHICLES = [
  { id: 'VEH-SIM-001', vin: 'WBA1234567890ABCD', licensePlate: '12345-A-1', brand: 'Toyota', model: 'Corolla', year: 2023, color: 'white', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 1800, horsePower: 140, weight: 1400, ownerId: 'DRV-SIM-001' },
  { id: 'VEH-SIM-002', vin: 'WBA2345678901BCDE', licensePlate: '23456-B-2', brand: 'Renault', model: 'Clio', year: 2022, color: 'blue', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 1600, horsePower: 120, weight: 1200, ownerId: 'DRV-SIM-002' },
  { id: 'VEH-SIM-003', vin: 'WBA3456789012CDEF', licensePlate: '34567-C-3', brand: 'Mercedes', model: 'Actros', year: 2021, color: 'silver', vehicleType: 'truck', fuelType: 'diesel', engineCapacity: 12000, horsePower: 450, weight: 8000, ownerId: 'DRV-SIM-003' },
  { id: 'VEH-SIM-004', vin: 'WBA4567890123DEFG', licensePlate: '45678-D-4', brand: 'Dacia', model: 'Duster', year: 2024, color: 'red', vehicleType: 'car', fuelType: 'diesel', engineCapacity: 1500, horsePower: 115, weight: 1350, ownerId: 'DRV-SIM-004' },
  { id: 'VEH-SIM-005', vin: 'WBA5678901234EFGH', licensePlate: '56789-E-5', brand: 'Volvo', model: 'FH16', year: 2020, color: 'green', vehicleType: 'bus', fuelType: 'diesel', engineCapacity: 16000, horsePower: 550, weight: 12000, ownerId: 'DRV-SIM-005' },
  { id: 'VEH-SIM-006', vin: 'WBA6789012345FGHI', licensePlate: '67890-F-6', brand: 'Peugeot', model: '208', year: 2023, color: 'black', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 136, weight: 1500, ownerId: 'DRV-SIM-006' },
  { id: 'VEH-SIM-007', vin: 'WBA7890123456GHIJ', licensePlate: '78901-G-7', brand: 'Honda', model: 'CBR', year: 2022, color: 'orange', vehicleType: 'motorcycle', fuelType: 'gasoline', engineCapacity: 600, horsePower: 120, weight: 200, ownerId: 'DRV-SIM-007' },
  { id: 'VEH-SIM-008', vin: 'WBA8901234567HIJK', licensePlate: '89012-H-8', brand: 'Volkswagen', model: 'Golf', year: 2021, color: 'gray', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 1400, horsePower: 150, weight: 1350, ownerId: 'DRV-SIM-008' },
  { id: 'VEH-SIM-009', vin: 'WBA9012345678IJKL', licensePlate: '90123-I-9', brand: 'Ford', model: 'Transit', year: 2023, color: 'white', vehicleType: 'truck', fuelType: 'diesel', engineCapacity: 2200, horsePower: 170, weight: 2800, ownerId: 'DRV-SIM-009' },
  { id: 'VEH-SIM-010', vin: 'WBA0123456789JKLM', licensePlate: '01234-J-10', brand: 'Tesla', model: 'Model 3', year: 2024, color: 'red', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 350, weight: 1800, ownerId: 'DRV-SIM-010' },
  { id: 'VEH-SIM-011', vin: 'WBA1111111111AAAA', licensePlate: '11111-K-11', brand: 'BMW', model: 'X5', year: 2023, color: 'black', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 3000, horsePower: 340, weight: 2200, ownerId: 'DRV-SIM-011' },
  { id: 'VEH-SIM-012', vin: 'WBA2222222222BBBB', licensePlate: '22222-L-12', brand: 'Audi', model: 'A4', year: 2022, color: 'silver', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 2000, horsePower: 190, weight: 1500, ownerId: 'DRV-SIM-012' },
  { id: 'VEH-SIM-013', vin: 'WBA3333333333CCCC', licensePlate: '33333-M-13', brand: 'Citroën', model: 'C3', year: 2021, color: 'yellow', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 1200, horsePower: 100, weight: 1100, ownerId: 'DRV-SIM-013' },
  { id: 'VEH-SIM-014', vin: 'WBA4444444444DDDD', licensePlate: '44444-N-14', brand: 'Fiat', model: '500', year: 2024, color: 'pink', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 118, weight: 1200, ownerId: 'DRV-SIM-014' },
  { id: 'VEH-SIM-015', vin: 'WBA5555555555EEEE', licensePlate: '55555-O-15', brand: 'Hyundai', model: 'Tucson', year: 2023, color: 'blue', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 1600, horsePower: 265, weight: 1700, ownerId: 'DRV-SIM-015' },
  { id: 'VEH-SIM-016', vin: 'WBA6666666666FFFF', licensePlate: '66666-P-16', brand: 'Kia', model: 'Sportage', year: 2022, color: 'green', vehicleType: 'car', fuelType: 'diesel', engineCapacity: 1600, horsePower: 136, weight: 1650, ownerId: 'DRV-SIM-016' },
  { id: 'VEH-SIM-017', vin: 'WBA7777777777GGGG', licensePlate: '77777-Q-17', brand: 'Nissan', model: 'Leaf', year: 2024, color: 'white', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 150, weight: 1600, ownerId: 'DRV-SIM-017' },
  { id: 'VEH-SIM-018', vin: 'WBA8888888888HHHH', licensePlate: '88888-R-18', brand: 'Mazda', model: 'CX-5', year: 2023, color: 'red', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 2500, horsePower: 188, weight: 1600, ownerId: 'DRV-SIM-018' },
  { id: 'VEH-SIM-019', vin: 'WBA9999999999IIII', licensePlate: '99999-S-19', brand: 'Suzuki', model: 'Swift', year: 2022, color: 'orange', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 1200, horsePower: 90, weight: 1000, ownerId: 'DRV-SIM-019' },
  { id: 'VEH-SIM-020', vin: 'WBA0000000000JJJJ', licensePlate: '00000-T-20', brand: 'Skoda', model: 'Octavia', year: 2021, color: 'gray', vehicleType: 'car', fuelType: 'diesel', engineCapacity: 2000, horsePower: 150, weight: 1400, ownerId: 'DRV-SIM-020' },
  { id: 'VEH-SIM-021', vin: 'WBA1112223334KKKK', licensePlate: '11122-U-21', brand: 'Seat', model: 'Leon', year: 2023, color: 'black', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 1500, horsePower: 150, weight: 1300, ownerId: 'DRV-SIM-021' },
  { id: 'VEH-SIM-022', vin: 'WBA2223334445LLLL', licensePlate: '22233-V-22', brand: 'Opel', model: 'Corsa', year: 2024, color: 'blue', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 136, weight: 1400, ownerId: 'DRV-SIM-022' },
  { id: 'VEH-SIM-023', vin: 'WBA3334445556MMMM', licensePlate: '33344-W-23', brand: 'MAN', model: 'TGX', year: 2021, color: 'white', vehicleType: 'truck', fuelType: 'diesel', engineCapacity: 15000, horsePower: 510, weight: 9000, ownerId: 'DRV-SIM-023' },
  { id: 'VEH-SIM-024', vin: 'WBA4445556667NNNN', licensePlate: '44455-X-24', brand: 'Scania', model: 'R500', year: 2022, color: 'red', vehicleType: 'truck', fuelType: 'diesel', engineCapacity: 13000, horsePower: 500, weight: 8500, ownerId: 'DRV-SIM-024' },
  { id: 'VEH-SIM-025', vin: 'WBA5556667778OOOO', licensePlate: '55566-Y-25', brand: 'Iveco', model: 'Daily', year: 2023, color: 'yellow', vehicleType: 'truck', fuelType: 'diesel', engineCapacity: 3000, horsePower: 180, weight: 3500, ownerId: 'DRV-SIM-025' },
  { id: 'VEH-SIM-026', vin: 'WBA6667778889PPPP', licensePlate: '66677-Z-26', brand: 'Yamaha', model: 'MT-07', year: 2024, color: 'black', vehicleType: 'motorcycle', fuelType: 'gasoline', engineCapacity: 700, horsePower: 75, weight: 180, ownerId: 'DRV-SIM-026' },
  { id: 'VEH-SIM-027', vin: 'WBA7778889990QQQQ', licensePlate: '77788-A-27', brand: 'Kawasaki', model: 'Z650', year: 2023, color: 'green', vehicleType: 'motorcycle', fuelType: 'gasoline', engineCapacity: 650, horsePower: 68, weight: 185, ownerId: 'DRV-SIM-027' },
  { id: 'VEH-SIM-028', vin: 'WBA8889990001RRRR', licensePlate: '88899-B-28', brand: 'Ducati', model: 'Monster', year: 2022, color: 'red', vehicleType: 'motorcycle', fuelType: 'gasoline', engineCapacity: 937, horsePower: 111, weight: 188, ownerId: 'DRV-SIM-028' },
  { id: 'VEH-SIM-029', vin: 'WBA9990001112SSSS', licensePlate: '99900-C-29', brand: 'BMW', model: 'R1250GS', year: 2024, color: 'silver', vehicleType: 'motorcycle', fuelType: 'gasoline', engineCapacity: 1250, horsePower: 136, weight: 249, ownerId: 'DRV-SIM-029' },
  { id: 'VEH-SIM-030', vin: 'WBA0001112223TTTT', licensePlate: '00011-D-30', brand: 'Mercedes', model: 'Citaro', year: 2021, color: 'white', vehicleType: 'bus', fuelType: 'diesel', engineCapacity: 12000, horsePower: 360, weight: 11500, ownerId: 'DRV-SIM-030' },
  { id: 'VEH-SIM-031', vin: 'WBA1112223344UUUU', licensePlate: '11122-E-31', brand: 'Volvo', model: '7900', year: 2023, color: 'blue', vehicleType: 'bus', fuelType: 'electric', engineCapacity: 0, horsePower: 350, weight: 13000, ownerId: 'DRV-SIM-031' },
  { id: 'VEH-SIM-032', vin: 'WBA2223334455VVVV', licensePlate: '22233-F-32', brand: 'Scania', model: 'Citywide', year: 2022, color: 'green', vehicleType: 'bus', fuelType: 'hybrid', engineCapacity: 9000, horsePower: 320, weight: 12000, ownerId: 'DRV-SIM-032' },
  { id: 'VEH-SIM-033', vin: 'WBA3334445566WWWW', licensePlate: '33344-G-33', brand: 'Porsche', model: 'Taycan', year: 2024, color: 'white', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 530, weight: 2200, ownerId: 'DRV-SIM-033' },
  { id: 'VEH-SIM-034', vin: 'WBA4445556677XXXX', licensePlate: '44455-H-34', brand: 'Jaguar', model: 'I-Pace', year: 2023, color: 'black', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 400, weight: 2200, ownerId: 'DRV-SIM-034' },
  { id: 'VEH-SIM-035', vin: 'WBA5556667788YYYY', licensePlate: '55566-I-35', brand: 'Land Rover', model: 'Defender', year: 2022, color: 'green', vehicleType: 'car', fuelType: 'diesel', engineCapacity: 3000, horsePower: 300, weight: 2400, ownerId: 'DRV-SIM-035' },
  { id: 'VEH-SIM-036', vin: 'WBA6667778899ZZZZ', licensePlate: '66677-J-36', brand: 'Jeep', model: 'Wrangler', year: 2024, color: 'orange', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 3600, horsePower: 285, weight: 2000, ownerId: 'DRV-SIM-036' },
  { id: 'VEH-SIM-037', vin: 'WBA7778889911AAAA', licensePlate: '77788-K-37', brand: 'Chevrolet', model: 'Camaro', year: 2023, color: 'yellow', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 6200, horsePower: 455, weight: 1700, ownerId: 'DRV-SIM-037' },
  { id: 'VEH-SIM-038', vin: 'WBA8889990022BBBB', licensePlate: '88899-L-38', brand: 'Ford', model: 'Mustang', year: 2022, color: 'blue', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 5000, horsePower: 450, weight: 1800, ownerId: 'DRV-SIM-038' },
  { id: 'VEH-SIM-039', vin: 'WBA9990001133CCCC', licensePlate: '99900-M-39', brand: 'Mini', model: 'Cooper', year: 2024, color: 'red', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 1500, horsePower: 136, weight: 1200, ownerId: 'DRV-SIM-039' },
  { id: 'VEH-SIM-040', vin: 'WBA0001112244DDDD', licensePlate: '00011-N-40', brand: 'Alfa Romeo', model: 'Giulia', year: 2023, color: 'white', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 2000, horsePower: 280, weight: 1500, ownerId: 'DRV-SIM-040' },
  { id: 'VEH-SIM-041', vin: 'WBA1112223355EEEE', licensePlate: '11122-O-41', brand: 'Lexus', model: 'ES', year: 2022, color: 'silver', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 2500, horsePower: 215, weight: 1700, ownerId: 'DRV-SIM-041' },
  { id: 'VEH-SIM-042', vin: 'WBA2223334466FFFF', licensePlate: '22233-P-42', brand: 'Infiniti', model: 'Q50', year: 2024, color: 'black', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 3000, horsePower: 300, weight: 1800, ownerId: 'DRV-SIM-042' },
  { id: 'VEH-SIM-043', vin: 'WBA3334445577GGGG', licensePlate: '33344-Q-43', brand: 'Genesis', model: 'G70', year: 2023, color: 'gray', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 2000, horsePower: 255, weight: 1700, ownerId: 'DRV-SIM-043' },
  { id: 'VEH-SIM-044', vin: 'WBA4445556688HHHH', licensePlate: '44455-R-44', brand: 'Subaru', model: 'Outback', year: 2022, color: 'blue', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 2500, horsePower: 182, weight: 1600, ownerId: 'DRV-SIM-044' },
  { id: 'VEH-SIM-045', vin: 'WBA5556667799IIII', licensePlate: '55566-S-45', brand: 'Mitsubishi', model: 'Outlander', year: 2024, color: 'white', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 2400, horsePower: 224, weight: 1900, ownerId: 'DRV-SIM-045' },
  { id: 'VEH-SIM-046', vin: 'WBA6667778800JJJJ', licensePlate: '66677-T-46', brand: 'Honda', model: 'Civic', year: 2023, color: 'red', vehicleType: 'car', fuelType: 'gasoline', engineCapacity: 1500, horsePower: 180, weight: 1350, ownerId: 'DRV-SIM-046' },
  { id: 'VEH-SIM-047', vin: 'WBA7778889011KKKK', licensePlate: '77788-U-47', brand: 'Toyota', model: 'RAV4', year: 2022, color: 'green', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 2500, horsePower: 222, weight: 1700, ownerId: 'DRV-SIM-047' },
  { id: 'VEH-SIM-048', vin: 'WBA8889990122LLLL', licensePlate: '88899-V-48', brand: 'Renault', model: 'Megane', year: 2024, color: 'yellow', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 220, weight: 1600, ownerId: 'DRV-SIM-048' },
  { id: 'VEH-SIM-049', vin: 'WBA9990001233MMMM', licensePlate: '99900-W-49', brand: 'Peugeot', model: '308', year: 2023, color: 'blue', vehicleType: 'car', fuelType: 'hybrid', engineCapacity: 1600, horsePower: 225, weight: 1500, ownerId: 'DRV-SIM-049' },
  { id: 'VEH-SIM-050', vin: 'WBA0001112344NNNN', licensePlate: '00011-X-50', brand: 'Volkswagen', model: 'ID.4', year: 2024, color: 'white', vehicleType: 'car', fuelType: 'electric', engineCapacity: 0, horsePower: 204, weight: 2100, ownerId: 'DRV-SIM-050' },
];

// 50 Conducteurs pour la simulation
const SIMULATION_DRIVERS = [
  { id: 'DRV-SIM-001', nationalId: 'AB123456', firstName: 'Ahmed', lastName: 'Bennani', dateOfBirth: '1985-03-15', address: '123 Rue Mohammed V, Casablanca', phone: '+212600111111', email: 'ahmed.bennani@email.ma', licenseNumber: 'LIC001234', licenseCategories: ['B'], licenseExpiryDate: '2028-03-15' },
  { id: 'DRV-SIM-002', nationalId: 'CD234567', firstName: 'Fatima', lastName: 'El Amrani', dateOfBirth: '1990-07-22', address: '45 Boulevard Hassan II, Rabat', phone: '+212600222222', email: 'fatima.elamrani@email.ma', licenseNumber: 'LIC002345', licenseCategories: ['B'], licenseExpiryDate: '2027-07-22' },
  { id: 'DRV-SIM-003', nationalId: 'EF345678', firstName: 'Mohammed', lastName: 'Tazi', dateOfBirth: '1978-11-08', address: '78 Avenue des FAR, Casablanca', phone: '+212600333333', email: 'mohammed.tazi@email.ma', licenseNumber: 'LIC003456', licenseCategories: ['B', 'C', 'D'], licenseExpiryDate: '2026-11-08' },
  { id: 'DRV-SIM-004', nationalId: 'GH456789', firstName: 'Sara', lastName: 'Idrissi', dateOfBirth: '1995-01-30', address: '12 Rue Ibn Batouta, Fès', phone: '+212600444444', email: 'sara.idrissi@email.ma', licenseNumber: 'LIC004567', licenseCategories: ['B'], licenseExpiryDate: '2029-01-30' },
  { id: 'DRV-SIM-005', nationalId: 'IJ567890', firstName: 'Youssef', lastName: 'Alaoui', dateOfBirth: '1982-09-12', address: '56 Boulevard Zerktouni, Casablanca', phone: '+212600555555', email: 'youssef.alaoui@email.ma', licenseNumber: 'LIC005678', licenseCategories: ['B', 'C', 'D', 'E'], licenseExpiryDate: '2025-09-12' },
  { id: 'DRV-SIM-006', nationalId: 'KL678901', firstName: 'Khadija', lastName: 'Berrada', dateOfBirth: '1988-04-25', address: '89 Avenue Moulay Rachid, Marrakech', phone: '+212600666666', email: 'khadija.berrada@email.ma', licenseNumber: 'LIC006789', licenseCategories: ['B'], licenseExpiryDate: '2028-04-25' },
  { id: 'DRV-SIM-007', nationalId: 'MN789012', firstName: 'Omar', lastName: 'Fassi', dateOfBirth: '1992-12-18', address: '34 Rue de Paris, Casablanca', phone: '+212600777777', email: 'omar.fassi@email.ma', licenseNumber: 'LIC007890', licenseCategories: ['A', 'B'], licenseExpiryDate: '2027-12-18' },
  { id: 'DRV-SIM-008', nationalId: 'OP890123', firstName: 'Amina', lastName: 'Cherkaoui', dateOfBirth: '1987-06-05', address: '67 Boulevard Anfa, Casablanca', phone: '+212600888888', email: 'amina.cherkaoui@email.ma', licenseNumber: 'LIC008901', licenseCategories: ['B'], licenseExpiryDate: '2026-06-05' },
  { id: 'DRV-SIM-009', nationalId: 'QR901234', firstName: 'Hassan', lastName: 'Benjelloun', dateOfBirth: '1975-02-28', address: '23 Avenue Ghandi, Rabat', phone: '+212600999999', email: 'hassan.benjelloun@email.ma', licenseNumber: 'LIC009012', licenseCategories: ['B', 'C'], licenseExpiryDate: '2025-02-28' },
  { id: 'DRV-SIM-010', nationalId: 'ST012345', firstName: 'Leila', lastName: 'Ouazzani', dateOfBirth: '1993-08-10', address: '90 Rue Hoummane El Fetouaki, Casablanca', phone: '+212600000000', email: 'leila.ouazzani@email.ma', licenseNumber: 'LIC010123', licenseCategories: ['B'], licenseExpiryDate: '2029-08-10' },
  { id: 'DRV-SIM-011', nationalId: 'UV123456', firstName: 'Rachid', lastName: 'El Fassi', dateOfBirth: '1980-05-20', address: '15 Rue Allal Ben Abdellah, Casablanca', phone: '+212601111111', email: 'rachid.elfassi@email.ma', licenseNumber: 'LIC011234', licenseCategories: ['B'], licenseExpiryDate: '2028-05-20' },
  { id: 'DRV-SIM-012', nationalId: 'WX234567', firstName: 'Nadia', lastName: 'Benkirane', dateOfBirth: '1991-09-14', address: '28 Boulevard Zerktouni, Casablanca', phone: '+212602222222', email: 'nadia.benkirane@email.ma', licenseNumber: 'LIC012345', licenseCategories: ['B'], licenseExpiryDate: '2027-09-14' },
  { id: 'DRV-SIM-013', nationalId: 'YZ345678', firstName: 'Karim', lastName: 'Lahlou', dateOfBirth: '1983-12-03', address: '52 Avenue des FAR, Casablanca', phone: '+212603333333', email: 'karim.lahlou@email.ma', licenseNumber: 'LIC013456', licenseCategories: ['B'], licenseExpiryDate: '2026-12-03' },
  { id: 'DRV-SIM-014', nationalId: 'AA456789', firstName: 'Salma', lastName: 'Kettani', dateOfBirth: '1996-02-28', address: '8 Rue Ibn Batouta, Rabat', phone: '+212604444444', email: 'salma.kettani@email.ma', licenseNumber: 'LIC014567', licenseCategories: ['B'], licenseExpiryDate: '2029-02-28' },
  { id: 'DRV-SIM-015', nationalId: 'BB567890', firstName: 'Mehdi', lastName: 'Chraibi', dateOfBirth: '1979-07-17', address: '41 Boulevard Hassan II, Casablanca', phone: '+212605555555', email: 'mehdi.chraibi@email.ma', licenseNumber: 'LIC015678', licenseCategories: ['B', 'C'], licenseExpiryDate: '2025-07-17' },
  { id: 'DRV-SIM-016', nationalId: 'CC678901', firstName: 'Zineb', lastName: 'Alami', dateOfBirth: '1989-11-25', address: '73 Avenue Moulay Rachid, Casablanca', phone: '+212606666666', email: 'zineb.alami@email.ma', licenseNumber: 'LIC016789', licenseCategories: ['B'], licenseExpiryDate: '2028-11-25' },
  { id: 'DRV-SIM-017', nationalId: 'DD789012', firstName: 'Anas', lastName: 'Senhaji', dateOfBirth: '1994-04-08', address: '19 Rue de Paris, Casablanca', phone: '+212607777777', email: 'anas.senhaji@email.ma', licenseNumber: 'LIC017890', licenseCategories: ['B'], licenseExpiryDate: '2027-04-08' },
  { id: 'DRV-SIM-018', nationalId: 'EE890123', firstName: 'Meryem', lastName: 'Filali', dateOfBirth: '1986-08-30', address: '64 Boulevard Anfa, Casablanca', phone: '+212608888888', email: 'meryem.filali@email.ma', licenseNumber: 'LIC018901', licenseCategories: ['B'], licenseExpiryDate: '2026-08-30' },
  { id: 'DRV-SIM-019', nationalId: 'FF901234', firstName: 'Driss', lastName: 'Belhaj', dateOfBirth: '1977-01-12', address: '36 Avenue Mers Sultan, Casablanca', phone: '+212609999999', email: 'driss.belhaj@email.ma', licenseNumber: 'LIC019012', licenseCategories: ['B', 'C', 'D'], licenseExpiryDate: '2025-01-12' },
  { id: 'DRV-SIM-020', nationalId: 'GG012345', firstName: 'Hajar', lastName: 'Touzani', dateOfBirth: '1992-06-22', address: '85 Rue Allal Ben Abdellah, Casablanca', phone: '+212610000000', email: 'hajar.touzani@email.ma', licenseNumber: 'LIC020123', licenseCategories: ['B'], licenseExpiryDate: '2029-06-22' },
  { id: 'DRV-SIM-021', nationalId: 'HH123456', firstName: 'Othmane', lastName: 'Sekkat', dateOfBirth: '1981-10-05', address: '47 Boulevard Mohammed V, Rabat', phone: '+212611111111', email: 'othmane.sekkat@email.ma', licenseNumber: 'LIC021234', licenseCategories: ['B'], licenseExpiryDate: '2028-10-05' },
  { id: 'DRV-SIM-022', nationalId: 'II234567', firstName: 'Sanae', lastName: 'Zniber', dateOfBirth: '1990-03-18', address: '31 Avenue des FAR, Casablanca', phone: '+212612222222', email: 'sanae.zniber@email.ma', licenseNumber: 'LIC022345', licenseCategories: ['B'], licenseExpiryDate: '2027-03-18' },
  { id: 'DRV-SIM-023', nationalId: 'JJ345678', firstName: 'Imad', lastName: 'Guerraoui', dateOfBirth: '1984-07-27', address: '59 Rue Ibn Batouta, Casablanca', phone: '+212613333333', email: 'imad.guerraoui@email.ma', licenseNumber: 'LIC023456', licenseCategories: ['B', 'C', 'D', 'E'], licenseExpiryDate: '2026-07-27' },
  { id: 'DRV-SIM-024', nationalId: 'KK456789', firstName: 'Houda', lastName: 'Rhazi', dateOfBirth: '1997-11-09', address: '13 Boulevard Hassan II, Casablanca', phone: '+212614444444', email: 'houda.rhazi@email.ma', licenseNumber: 'LIC024567', licenseCategories: ['B', 'C', 'D', 'E'], licenseExpiryDate: '2029-11-09' },
  { id: 'DRV-SIM-025', nationalId: 'LL567890', firstName: 'Badr', lastName: 'Mekouar', dateOfBirth: '1976-04-14', address: '72 Avenue Moulay Rachid, Casablanca', phone: '+212615555555', email: 'badr.mekouar@email.ma', licenseNumber: 'LIC025678', licenseCategories: ['B', 'C'], licenseExpiryDate: '2025-04-14' },
  { id: 'DRV-SIM-026', nationalId: 'MM678901', firstName: 'Rim', lastName: 'Benchekroun', dateOfBirth: '1988-08-21', address: '26 Rue de Paris, Casablanca', phone: '+212616666666', email: 'rim.benchekroun@email.ma', licenseNumber: 'LIC026789', licenseCategories: ['A', 'B'], licenseExpiryDate: '2028-08-21' },
  { id: 'DRV-SIM-027', nationalId: 'NN789012', firstName: 'Adil', lastName: 'Daoudi', dateOfBirth: '1993-12-06', address: '94 Boulevard Anfa, Casablanca', phone: '+212617777777', email: 'adil.daoudi@email.ma', licenseNumber: 'LIC027890', licenseCategories: ['A', 'B'], licenseExpiryDate: '2027-12-06' },
  { id: 'DRV-SIM-028', nationalId: 'OO890123', firstName: 'Lamia', lastName: 'Hajji', dateOfBirth: '1985-05-29', address: '38 Avenue Mers Sultan, Casablanca', phone: '+212618888888', email: 'lamia.hajji@email.ma', licenseNumber: 'LIC028901', licenseCategories: ['A', 'B'], licenseExpiryDate: '2026-05-29' },
  { id: 'DRV-SIM-029', nationalId: 'PP901234', firstName: 'Younes', lastName: 'Sbai', dateOfBirth: '1978-09-16', address: '61 Rue Allal Ben Abdellah, Casablanca', phone: '+212619999999', email: 'younes.sbai@email.ma', licenseNumber: 'LIC029012', licenseCategories: ['A', 'B'], licenseExpiryDate: '2025-09-16' },
  { id: 'DRV-SIM-030', nationalId: 'QQ012345', firstName: 'Asmae', lastName: 'Laghzaoui', dateOfBirth: '1991-02-03', address: '17 Boulevard Mohammed V, Casablanca', phone: '+212620000000', email: 'asmae.laghzaoui@email.ma', licenseNumber: 'LIC030123', licenseCategories: ['B', 'C', 'D', 'E'], licenseExpiryDate: '2029-02-03' },
  { id: 'DRV-SIM-031', nationalId: 'RR123456', firstName: 'Soufiane', lastName: 'Tahiri', dateOfBirth: '1982-06-19', address: '44 Avenue des FAR, Casablanca', phone: '+212621111111', email: 'soufiane.tahiri@email.ma', licenseNumber: 'LIC031234', licenseCategories: ['B', 'C', 'D', 'E'], licenseExpiryDate: '2028-06-19' },
  { id: 'DRV-SIM-032', nationalId: 'SS234567', firstName: 'Ghita', lastName: 'Qadiri', dateOfBirth: '1995-10-31', address: '78 Rue Ibn Batouta, Casablanca', phone: '+212622222222', email: 'ghita.qadiri@email.ma', licenseNumber: 'LIC032345', licenseCategories: ['B', 'C', 'D', 'E'], licenseExpiryDate: '2027-10-31' },
  { id: 'DRV-SIM-033', nationalId: 'TT345678', firstName: 'Ayoub', lastName: 'Bennis', dateOfBirth: '1987-03-24', address: '55 Boulevard Hassan II, Casablanca', phone: '+212623333333', email: 'ayoub.bennis@email.ma', licenseNumber: 'LIC033456', licenseCategories: ['B'], licenseExpiryDate: '2026-03-24' },
  { id: 'DRV-SIM-034', nationalId: 'UU456789', firstName: 'Loubna', lastName: 'Sabri', dateOfBirth: '1998-07-11', address: '22 Avenue Moulay Rachid, Casablanca', phone: '+212624444444', email: 'loubna.sabri@email.ma', licenseNumber: 'LIC034567', licenseCategories: ['B'], licenseExpiryDate: '2029-07-11' },
  { id: 'DRV-SIM-035', nationalId: 'VV567890', firstName: 'Khalid', lastName: 'Boutaleb', dateOfBirth: '1974-11-28', address: '89 Rue de Paris, Casablanca', phone: '+212625555555', email: 'khalid.boutaleb@email.ma', licenseNumber: 'LIC035678', licenseCategories: ['B'], licenseExpiryDate: '2025-11-28' },
  { id: 'DRV-SIM-036', nationalId: 'WW678901', firstName: 'Naima', lastName: 'Lamrani', dateOfBirth: '1989-04-07', address: '33 Boulevard Anfa, Casablanca', phone: '+212626666666', email: 'naima.lamrani@email.ma', licenseNumber: 'LIC036789', licenseCategories: ['B'], licenseExpiryDate: '2028-04-07' },
  { id: 'DRV-SIM-037', nationalId: 'XX789012', firstName: 'Zakaria', lastName: 'Chami', dateOfBirth: '1994-08-23', address: '66 Avenue Mers Sultan, Casablanca', phone: '+212627777777', email: 'zakaria.chami@email.ma', licenseNumber: 'LIC037890', licenseCategories: ['B'], licenseExpiryDate: '2027-08-23' },
  { id: 'DRV-SIM-038', nationalId: 'YY890123', firstName: 'Ikram', lastName: 'Bouzid', dateOfBirth: '1986-12-15', address: '11 Rue Allal Ben Abdellah, Casablanca', phone: '+212628888888', email: 'ikram.bouzid@email.ma', licenseNumber: 'LIC038901', licenseCategories: ['B'], licenseExpiryDate: '2026-12-15' },
  { id: 'DRV-SIM-039', nationalId: 'ZZ901234', firstName: 'Taha', lastName: 'Nejjar', dateOfBirth: '1979-05-02', address: '48 Boulevard Mohammed V, Casablanca', phone: '+212629999999', email: 'taha.nejjar@email.ma', licenseNumber: 'LIC039012', licenseCategories: ['B'], licenseExpiryDate: '2025-05-02' },
  { id: 'DRV-SIM-040', nationalId: 'AB012345', firstName: 'Rania', lastName: 'El Khattabi', dateOfBirth: '1992-09-26', address: '75 Avenue des FAR, Casablanca', phone: '+212630000000', email: 'rania.elkhattabi@email.ma', licenseNumber: 'LIC040123', licenseCategories: ['B'], licenseExpiryDate: '2029-09-26' },
  { id: 'DRV-SIM-041', nationalId: 'CD123456', firstName: 'Hamza', lastName: 'Raissouni', dateOfBirth: '1983-01-18', address: '29 Rue Ibn Batouta, Casablanca', phone: '+212631111111', email: 'hamza.raissouni@email.ma', licenseNumber: 'LIC041234', licenseCategories: ['B'], licenseExpiryDate: '2028-01-18' },
  { id: 'DRV-SIM-042', nationalId: 'EF234567', firstName: 'Safae', lastName: 'Moussaoui', dateOfBirth: '1996-05-09', address: '62 Boulevard Hassan II, Casablanca', phone: '+212632222222', email: 'safae.moussaoui@email.ma', licenseNumber: 'LIC042345', licenseCategories: ['B'], licenseExpiryDate: '2027-05-09' },
  { id: 'DRV-SIM-043', nationalId: 'GH345678', firstName: 'Walid', lastName: 'Benjelloun', dateOfBirth: '1988-09-21', address: '96 Avenue Moulay Rachid, Casablanca', phone: '+212633333333', email: 'walid.benjelloun@email.ma', licenseNumber: 'LIC043456', licenseCategories: ['B'], licenseExpiryDate: '2026-09-21' },
  { id: 'DRV-SIM-044', nationalId: 'IJ456789', firstName: 'Chaimae', lastName: 'Slaoui', dateOfBirth: '1999-02-14', address: '14 Rue de Paris, Casablanca', phone: '+212634444444', email: 'chaimae.slaoui@email.ma', licenseNumber: 'LIC044567', licenseCategories: ['B'], licenseExpiryDate: '2029-02-14' },
  { id: 'DRV-SIM-045', nationalId: 'KL567890', firstName: 'Reda', lastName: 'Amraoui', dateOfBirth: '1975-06-30', address: '51 Boulevard Anfa, Casablanca', phone: '+212635555555', email: 'reda.amraoui@email.ma', licenseNumber: 'LIC045678', licenseCategories: ['B'], licenseExpiryDate: '2025-06-30' },
  { id: 'DRV-SIM-046', nationalId: 'MN678901', firstName: 'Ilham', lastName: 'Zerhouni', dateOfBirth: '1990-10-17', address: '87 Avenue Mers Sultan, Casablanca', phone: '+212636666666', email: 'ilham.zerhouni@email.ma', licenseNumber: 'LIC046789', licenseCategories: ['B'], licenseExpiryDate: '2028-10-17' },
  { id: 'DRV-SIM-047', nationalId: 'OP789012', firstName: 'Ismail', lastName: 'Fakhri', dateOfBirth: '1993-03-05', address: '24 Rue Allal Ben Abdellah, Casablanca', phone: '+212637777777', email: 'ismail.fakhri@email.ma', licenseNumber: 'LIC047890', licenseCategories: ['B'], licenseExpiryDate: '2027-03-05' },
  { id: 'DRV-SIM-048', nationalId: 'QR890123', firstName: 'Hiba', lastName: 'Kadiri', dateOfBirth: '1985-07-28', address: '69 Boulevard Mohammed V, Casablanca', phone: '+212638888888', email: 'hiba.kadiri@email.ma', licenseNumber: 'LIC048901', licenseCategories: ['B'], licenseExpiryDate: '2026-07-28' },
  { id: 'DRV-SIM-049', nationalId: 'ST901234', firstName: 'Amine', lastName: 'Ouahbi', dateOfBirth: '1980-11-11', address: '42 Avenue des FAR, Casablanca', phone: '+212639999999', email: 'amine.ouahbi@email.ma', licenseNumber: 'LIC049012', licenseCategories: ['B'], licenseExpiryDate: '2025-11-11' },
  { id: 'DRV-SIM-050', nationalId: 'UV012345', firstName: 'Dounia', lastName: 'Sahli', dateOfBirth: '1997-04-24', address: '16 Rue Ibn Batouta, Casablanca', phone: '+212640000000', email: 'dounia.sahli@email.ma', licenseNumber: 'LIC050123', licenseCategories: ['B'], licenseExpiryDate: '2029-04-24' },
];

// 8 Intersections
const SIMULATION_INTERSECTIONS = [
  { id: 'INT-001', name: 'Carrefour Mohammed V - Hassan II', type: 'signalized', location: { lat: 33.5731, lng: -7.5898 }, connectedRoads: ['ROAD-001', 'ROAD-002'], trafficLightPhases: 4, cycleDuration: 120 },
  { id: 'INT-002', name: 'Rond-point Zerktouni', type: 'roundabout', location: { lat: 33.5800, lng: -7.6150 }, connectedRoads: ['ROAD-005', 'ROAD-008'], trafficLightPhases: 0, cycleDuration: 0 },
  { id: 'INT-003', name: 'Carrefour FAR - Mers Sultan', type: 'signalized', location: { lat: 33.5780, lng: -7.5950 }, connectedRoads: ['ROAD-004', 'ROAD-010'], trafficLightPhases: 3, cycleDuration: 90 },
  { id: 'INT-004', name: 'Place des Nations Unies', type: 'roundabout', location: { lat: 33.5740, lng: -7.5880 }, connectedRoads: ['ROAD-009', 'ROAD-003'], trafficLightPhases: 0, cycleDuration: 0 },
  { id: 'INT-005', name: 'Carrefour Anfa - Ibn Batouta', type: 'signalized', location: { lat: 33.5850, lng: -7.6100 }, connectedRoads: ['ROAD-008', 'ROAD-006'], trafficLightPhases: 4, cycleDuration: 150 },
  { id: 'INT-006', name: 'Carrefour Moulay Rachid - Zerktouni', type: 'signalized', location: { lat: 33.5600, lng: -7.6000 }, connectedRoads: ['ROAD-007', 'ROAD-005'], trafficLightPhases: 4, cycleDuration: 120 },
  { id: 'INT-007', name: 'Rond-point Hassan II', type: 'roundabout', location: { lat: 33.5920, lng: -7.6350 }, connectedRoads: ['ROAD-002', 'ROAD-008'], trafficLightPhases: 0, cycleDuration: 0 },
  { id: 'INT-008', name: 'Carrefour Allal Ben Abdellah - Mers Sultan', type: 'signalized', location: { lat: 33.5650, lng: -7.5900 }, connectedRoads: ['ROAD-003', 'ROAD-010'], trafficLightPhases: 5, cycleDuration: 180 },
];

// ============================================================================
// FONCTIONS D'INITIALISATION
// ============================================================================

/**
 * Initialiser toutes les données de simulation
 */
async function initializeSimulationData() {
  logger.info('=== INITIALISATION DES DONNÉES DE SIMULATION ===');
  
  const results = {
    roads: { success: 0, failed: 0 },
    vehicles: { success: 0, failed: 0 },
    drivers: { success: 0, failed: 0 },
    intersections: { success: 0, failed: 0 },
  };

  // 1. Initialiser les routes (10)
  logger.info('Initialisation des 10 routes...');
  for (const road of SIMULATION_ROADS) {
    try {
      await fabricService.submitTransaction(
        ROAD_MANAGER,
        'CreateRoad',
        road.id,
        road.name,
        `Route ${road.roadType} - ${road.lanes} voies`,
        JSON.stringify(road.startPoint),
        JSON.stringify(road.endPoint),
        road.length.toString(),
        road.lanes.toString(),
        road.speedLimit.toString(),
        road.roadType,
        'good'
      );
      results.roads.success++;
    } catch (error) {
      if (!error.message.includes('existe déjà') && !error.message.includes('already exists')) {
        logger.warn(`Failed to create road ${road.id}: ${error.message}`);
      }
      results.roads.failed++;
    }
  }
  logger.info(`Routes: ${results.roads.success} créées, ${results.roads.failed} ignorées`);

  // 2. Initialiser les conducteurs (50)
  logger.info('Initialisation des 50 conducteurs...');
  for (const driver of SIMULATION_DRIVERS) {
    try {
      await fabricService.submitTransaction(
        TRAFFIC_REGISTRY,
        'RegisterDriver',
        driver.id,
        driver.nationalId,
        driver.firstName,
        driver.lastName,
        driver.dateOfBirth,
        driver.address,
        driver.phone,
        driver.email,
        driver.licenseNumber,
        JSON.stringify(driver.licenseCategories),
        driver.licenseExpiryDate
      );
      results.drivers.success++;
    } catch (error) {
      if (!error.message.includes('existe déjà') && !error.message.includes('already exists')) {
        logger.warn(`Failed to create driver ${driver.id}: ${error.message}`);
      }
      results.drivers.failed++;
    }
  }
  logger.info(`Conducteurs: ${results.drivers.success} créés, ${results.drivers.failed} ignorés`);

  // 3. Initialiser les véhicules (50)
  logger.info('Initialisation des 50 véhicules...');
  for (const vehicle of SIMULATION_VEHICLES) {
    try {
      await fabricService.submitTransaction(
        TRAFFIC_REGISTRY,
        'RegisterVehicle',
        vehicle.id,
        vehicle.vin,
        vehicle.licensePlate,
        vehicle.brand,
        vehicle.model,
        vehicle.year.toString(),
        vehicle.color,
        vehicle.vehicleType,
        vehicle.fuelType,
        vehicle.engineCapacity.toString(),
        vehicle.horsePower.toString(),
        vehicle.weight.toString(),
        vehicle.ownerId
      );
      results.vehicles.success++;
    } catch (error) {
      if (!error.message.includes('existe déjà') && !error.message.includes('already exists')) {
        logger.warn(`Failed to create vehicle ${vehicle.id}: ${error.message}`);
      }
      results.vehicles.failed++;
    }
  }
  logger.info(`Véhicules: ${results.vehicles.success} créés, ${results.vehicles.failed} ignorés`);

  // 4. Initialiser les intersections (8)
  logger.info('Initialisation des 8 intersections...');
  for (const intersection of SIMULATION_INTERSECTIONS) {
    try {
      await fabricService.submitTransaction(
        ROAD_MANAGER,
        'CreateIntersection',
        intersection.id,
        intersection.name,
        intersection.type,
        JSON.stringify(intersection.location),
        JSON.stringify(intersection.connectedRoads),
        intersection.trafficLightPhases.toString(),
        intersection.cycleDuration.toString()
      );
      results.intersections.success++;
    } catch (error) {
      if (!error.message.includes('existe déjà') && !error.message.includes('already exists')) {
        logger.warn(`Failed to create intersection ${intersection.id}: ${error.message}`);
      }
      results.intersections.failed++;
    }
  }
  logger.info(`Intersections: ${results.intersections.success} créées, ${results.intersections.failed} ignorées`);

  logger.info('=== INITIALISATION TERMINÉE ===');
  logger.info(`Résumé: ${results.roads.success} routes, ${results.vehicles.success} véhicules, ${results.drivers.success} conducteurs, ${results.intersections.success} intersections`);
  
  return results;
}

/**
 * Obtenir les données de simulation (pour affichage)
 */
function getSimulationData() {
  return {
    roads: SIMULATION_ROADS,
    vehicles: SIMULATION_VEHICLES,
    drivers: SIMULATION_DRIVERS,
    intersections: SIMULATION_INTERSECTIONS,
    summary: {
      totalRoads: SIMULATION_ROADS.length,
      totalVehicles: SIMULATION_VEHICLES.length,
      totalDrivers: SIMULATION_DRIVERS.length,
      totalIntersections: SIMULATION_INTERSECTIONS.length,
      totalRoadLength: SIMULATION_ROADS.reduce((sum, r) => sum + r.length, 0).toFixed(1),
      roadTypes: {
        highway: SIMULATION_ROADS.filter(r => r.roadType === 'highway').length,
        primary: SIMULATION_ROADS.filter(r => r.roadType === 'primary').length,
        secondary: SIMULATION_ROADS.filter(r => r.roadType === 'secondary').length,
        residential: SIMULATION_ROADS.filter(r => r.roadType === 'residential').length,
        commercial: SIMULATION_ROADS.filter(r => r.roadType === 'commercial').length,
      },
      vehicleTypes: {
        car: SIMULATION_VEHICLES.filter(v => v.vehicleType === 'car').length,
        truck: SIMULATION_VEHICLES.filter(v => v.vehicleType === 'truck').length,
        bus: SIMULATION_VEHICLES.filter(v => v.vehicleType === 'bus').length,
        motorcycle: SIMULATION_VEHICLES.filter(v => v.vehicleType === 'motorcycle').length,
      }
    }
  };
}

module.exports = {
  initializeSimulationData,
  getSimulationData,
  SIMULATION_ROADS,
  SIMULATION_VEHICLES,
  SIMULATION_DRIVERS,
  SIMULATION_INTERSECTIONS,
};
