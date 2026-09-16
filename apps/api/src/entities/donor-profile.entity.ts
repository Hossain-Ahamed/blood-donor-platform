import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { BloodGroup } from '@repo/shared';
import { User } from './user.entity';
import { Point } from 'geojson';

@Entity('donor_profiles')
export class DonorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: BloodGroup,
  })
  blood_group: BloodGroup;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @Column()
  area_name: string;

  @Column({ type: 'date', nullable: true })
  last_donation_date: Date;

  @Column({ default: true })
  is_available: boolean;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'smallint', nullable: true })
  age: number;

  @Column({ nullable: true })
  religion: string;

  @Column({ type: 'text', nullable: true })
  health_notes: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}
