// backend/src/modules/vehicles/entities/vehicle.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, ManyToOne, OneToMany,
  JoinColumn, Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  @Index()
  seller_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @Column({ nullable: true, name: 'dealer_id', type: 'uuid' })
  dealer_id: string;

  @Column({
    name: 'vehicle_type',
    type: 'enum',
    enum: ['car', 'bike', 'auto_part', 'number_plate', 'truck', 'van'],
    default: 'car',
  })
  vehicle_type: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'active', 'sold', 'expired', 'rejected', 'boosted'],
    default: 'draft',
  })
  @Index()
  status: string;

  @Column({ length: 500 })
  title: string;

  @Column({ nullable: true, name: 'title_urdu', length: 500 })
  title_urdu: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true, name: 'description_urdu', type: 'text' })
  description_urdu: string;

  // ── Vehicle Specs ─────────────────────────────────────────
  @Column({ length: 100 })
  @Index()
  make: string;

  @Column({ length: 100 })
  @Index()
  model: string;

  @Column({ nullable: true, length: 100 })
  variant: string;

  @Column()
  @Index()
  year: number;

  @Column({ nullable: true, length: 50 })
  color: string;

  @Column({
    nullable: true, name: 'body_type', type: 'enum',
    enum: ['sedan', 'suv', 'hatchback', 'coupe', 'pickup', 'van', 'minivan', 'crossover', 'convertible', 'wagon'],
  })
  body_type: string;

  @Column({
    nullable: true, name: 'fuel_type', type: 'enum',
    enum: ['petrol', 'diesel', 'hybrid', 'electric', 'cng', 'lpg'],
  })
  fuel_type: string;

  @Column({
    nullable: true, type: 'enum',
    enum: ['manual', 'automatic', 'semi_automatic', 'cvt'],
  })
  transmission: string;

  @Column({
    nullable: true, type: 'enum',
    enum: ['local', 'imported'],
  })
  assembly: string;

  @Column({
    name: 'condition_type', type: 'enum',
    enum: ['new', 'used', 'certified_used'],
    default: 'used',
  })
  condition_type: string;

  @Column({ nullable: true, name: 'engine_capacity' })
  engine_capacity: number;

  @Column({ nullable: true })
  mileage: number;

  @Column({ nullable: true, name: 'registered_city', length: 100 })
  registered_city: string;

  @Column({ nullable: true, name: 'registration_year' })
  registration_year: number;

  @Column({ nullable: true, length: 50 })
  vin: string;

  @Column({ nullable: true, name: 'chassis_number', length: 100 })
  chassis_number: string;

  @Column({ nullable: true, name: 'number_plate', length: 20 })
  number_plate: string;

  // ── Pricing ───────────────────────────────────────────────
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @Index()
  price: number;

  @Column({ default: true, name: 'price_negotiable' })
  price_negotiable: boolean;

  @Column({ nullable: true, name: 'ai_estimated_price_min', type: 'decimal', precision: 15, scale: 2 })
  ai_estimated_price_min: number;

  @Column({ nullable: true, name: 'ai_estimated_price_max', type: 'decimal', precision: 15, scale: 2 })
  ai_estimated_price_max: number;

  @Column({ name: 'price_history', type: 'jsonb', default: '[]' })
  price_history: Array<{ price: number; changed_at: Date }>;

  // ── Location ──────────────────────────────────────────────
  @Column({ length: 100 })
  @Index()
  city: string;

  @Column({ nullable: true, length: 100 })
  area: string;

  @Column({ nullable: true, name: 'location_lat', type: 'decimal', precision: 10, scale: 8 })
  location_lat: number;

  @Column({ nullable: true, name: 'location_lng', type: 'decimal', precision: 11, scale: 8 })
  location_lng: number;

  // ── Features ──────────────────────────────────────────────
  @Column({ type: 'jsonb', default: '[]' })
  features: string[];

  // ── Stats ─────────────────────────────────────────────────
  @Column({ default: 0, name: 'view_count' })
  view_count: number;

  @Column({ default: 0, name: 'contact_count' })
  contact_count: number;

  @Column({ default: 0, name: 'favorite_count' })
  favorite_count: number;

  // ── Boosting ──────────────────────────────────────────────
  @Column({ default: false, name: 'is_featured' })
  is_featured: boolean;

  @Column({ default: false, name: 'is_boosted' })
  is_boosted: boolean;

  @Column({ nullable: true, name: 'boost_expires_at', type: 'timestamptz' })
  boost_expires_at: Date;

  // ── Trust ─────────────────────────────────────────────────
  @Column({ nullable: true, name: 'inspection_status', type: 'enum',
    enum: ['requested', 'scheduled', 'in_progress', 'completed', 'cancelled'] })
  inspection_status: string;

  @Column({ default: false, name: 'inspection_badge' })
  inspection_badge: boolean;

  @Column({ default: 0, name: 'fraud_risk_score' })
  fraud_risk_score: number;

  @Column({ name: 'ai_fraud_flags', type: 'jsonb', default: '[]' })
  ai_fraud_flags: string[];

  @Column({ nullable: true, name: 'published_at', type: 'timestamptz' })
  published_at: Date;

  @Column({ nullable: true, name: 'expires_at', type: 'timestamptz' })
  expires_at: Date;

  @Column({ nullable: true, name: 'sold_at', type: 'timestamptz' })
  sold_at: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deleted_at: Date;
}
