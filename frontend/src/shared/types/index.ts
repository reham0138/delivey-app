/**
 * Shared domain types matching the JSON fixtures in public/mock.
 * Date/time values are ISO 8601 strings as received from JSON.
 */
export type UserRole = "admin" | "restaurant" | "customer";
export type AccountStatus = "active" | "suspended";
export type OrderStatus = "pending" | "preparing" | "ready" | "on_the_way" | "delivered" | "cancelled";
export type PaymentMethod = "cash" | "card";
export type CancellationActor = "customer" | "restaurant" | "admin";

interface BaseUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: AccountStatus;
  createdAt: string;
  /** Demo fixture only. Never use for real authentication or production credentials. */
  mockPassword?: string;
}

export interface AdminUser extends BaseUser {
  role: "admin";
  address?: never;
  restaurantId?: never;
}
export interface RestaurantOwnerUser extends BaseUser {
  role: "restaurant";
  restaurantId: number;
  address?: never;
}
export interface CustomerUser extends BaseUser {
  role: "customer";
  address: string;
  restaurantId?: never;
}
export type User = AdminUser | RestaurantOwnerUser | CustomerUser;

export interface Restaurant {
  id: number;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTimeMinutes: number;
  deliveryFee: number;
  minOrder: number;
  isOpen: boolean;
  address: string;
  image: string;
  ownerId: number;
  phone: string;
  isActive: boolean;
  createdAt: string;
  /** Optional presentation fields; existing fixtures and API payloads remain valid. */
  cover?: string;
  reviewsCount?: number;
  openingHours?: string;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}
export interface MenuItem {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  price: number;
  /** Matches Category.name; kept dynamic because categories are data-driven. */
  category: string;
  image: string | null;
  isAvailable: boolean;
  ingredients: string[];
  preparationTimeMinutes: number;
  nutrition: Nutrition | null;
  rating: number;
  reviewsCount: number;
  isPopular: boolean;
}
export interface Category {
  id: number;
  name: string;
  isActive: boolean;
  itemsCount: number;
}

export interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  /** Price snapshot saved when the order was placed. */
  unitPrice: number;
}
export interface OrderStatusHistoryEntry {
  status: OrderStatus;
  at: string;
}
export interface Order {
  id: number;
  customerId: number;
  customerName: string;
  phone: string;
  restaurantId: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
  statusHistory: OrderStatusHistoryEntry[];
  cancelledBy: CancellationActor | null;
  cancellationReason: string | null;
  /** Optional checkout breakdown; absent on historical fixture orders. */
  serviceFee?: number;
  tax?: number;
  discount?: number;
  tip?: number;
  promoCode?: string | null;
  scheduledFor?: string | null;
  estimatedDeliveryAt?: string;
  paymentStatus?: 'pending' | 'simulated';
  simulatedTracking?: boolean;
}

export interface Review {
  id: number;
  menuItemId: number;
  restaurantId: number;
  customerId: number;
  customerName: string;
  orderId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string | null;
  isReported: boolean;
  reportReason: string | null;
}

export interface DailyOrderRevenue {
  date: string;
  orders: number;
  revenue: number;
}
export interface TopRestaurant {
  restaurantId: number;
  name: string;
  orders: number;
  revenue: number;
}
export interface TopMenuItem {
  name: string;
  units: number;
}
/** Keys with zero orders may be omitted; an empty object is valid. */
export type OrdersByStatus = Partial<Record<OrderStatus, number>>;

export interface AdminStats {
  totalOrders: number;
  ordersByStatus: OrdersByStatus;
  totalRevenue: number;
  usersByRole: Record<UserRole, number>;
  suspendedUsers: number;
  activeRestaurants: number;
  reportedReviews: number;
  last14Days: DailyOrderRevenue[];
  topRestaurants: TopRestaurant[];
}
export interface RestaurantStats {
  restaurantId: number;
  totalOrders: number;
  ordersByStatus: OrdersByStatus;
  revenue: number;
  averageRating: number;
  reviewsCount: number;
  topItems: TopMenuItem[];
}
export interface Stats {
  asOf: string;
  admin: AdminStats;
  /** JSON object keys are restaurant IDs serialized as strings. */
  restaurants: Record<string, RestaurantStats>;
}

/** Array types corresponding to the public/mock JSON fixtures. */
export type UsersData = User[];
export type RestaurantsData = Restaurant[];
export type MenuItemsData = MenuItem[];
export type CategoriesData = Category[];
export type OrdersData = Order[];
export type ReviewsData = Review[];
export type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  Role,
  User as AuthUser,
} from "./user";
