// backend/src/modules/users/entities/user.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, OneToMany, Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ nullable: true, length: 20 })
  phone: string;

  @Index({ unique: true })
  @Column({ nullable: true, length: 255 })
  email: string;

  @Column({ nullable: true, name: 'google_id', length: 255 })
  google_id: string;

  @Column({ nullable: true, name: 'apple_id', length: 255 })
  apple_id: string;

  @Column({ name: 'full_name', length: 255 })
  full_name: string;

  @Index({ unique: true })
  @Column({ nullable: true, length: 100 })
  username: string;

  @Column({ nullable: true, name: 'avatar_url', type: 'text' })
  avatar_url: string;

  @Column({ nullable: true, type: 'text' })
  bio: string;

  @Column({
    type: 'enum',
    enum: ['buyer', 'seller', 'dealer', 'admin', 'moderator'],
    default: 'buyer',
  })
  role: string;

  @Column({ nullable: true, length: 100 })
  city: string;

  @Column({ nullable: true, name: 'location_lat', type: 'decimal', precision: 10, scale: 8 })
  location_lat: number;

  @Column({ nullable: true, name: 'location_lng', type: 'decimal', precision: 11, scale: 8 })
  location_lng: number;

  @Column({ default: true, name: 'is_active' })
  is_active: boolean;

  @Column({ default: false, name: 'is_blocked' })
  is_blocked: boolean;

  @Column({ nullable: true, name: 'cnic_number', length: 20, select: false })
  cnic_number: string;

  @Column({ default: false, name: 'cnic_verified' })
  cnic_verified: boolean;

  @Column({ default: false, name: 'phone_verified' })
  phone_verified: boolean;

  @Column({ default: false, name: 'email_verified' })
  email_verified: boolean;

  @Column({ default: 50, name: 'trust_score' })
  trust_score: number;

  @Column({ default: 0, name: 'fraud_risk_score' })
  fraud_risk_score: number;

  @Column({ default: 0, name: 'total_listings' })
  total_listings: number;

  @Column({ default: 0, name: 'total_sold' })
  total_sold: number;

  @Column({ default: 0, type: 'decimal', precision: 3, scale: 2, name: 'avg_rating' })
  avg_rating: number;

  @Column({ default: 0, name: 'total_reviews' })
  total_reviews: number;

  @Column({ default: 0, name: 'followers_count' })
  followers_count: number;

  @Column({ default: 0, name: 'following_count' })
  following_count: number;

  @Column({ nullable: true, unique: true, name: 'referral_code', length: 20 })
  referral_code: string;

  @Column({ nullable: true, name: 'referred_by', type: 'uuid' })
  referred_by: string;

  @Column({ nullable: true, name: 'last_active_at', type: 'timestamptz' })
  last_active_at: Date;

  @Column({ default: 'en', name: 'preferred_language', length: 10 })
  preferred_language: string;

  @Column({ nullable: true, name: 'push_token', type: 'text' })
  push_token: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deleted_at: Date;
}
