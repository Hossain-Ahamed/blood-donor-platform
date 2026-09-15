import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BloodGroup, ComponentType, UrgencyLevel, RequestStatus } from '@repo/shared';
import { User } from './user.entity';
import { Point } from 'geojson';

@Entity('requests')
export class BloodRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  requester_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requester_id' })
  requester: User;

  @Column({
    type: 'enum',
    enum: BloodGroup,
  })
  blood_group: BloodGroup;

  @Column({
    type: 'enum',
    enum: ComponentType,
    default: ComponentType.WHOLE_BLOOD,
  })
  component_type: ComponentType;

  @Column({ type: 'smallint', default: 1 })
  units_needed: number;

  @Column({ type: 'smallint', default: 0 })
  units_fulfilled: number;

  @Column({
    type: 'enum',
    enum: UrgencyLevel,
    default: UrgencyLevel.NORMAL,
  })
  urgency: UrgencyLevel;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  @Column()
  area_name: string;

  @Column({ nullable: true })
  hospital_name: string;

  @Column({ type: 'text', nullable: true })
  patient_note: string;

  @Column()
  contact_phone: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.OPEN,
  })
  status: RequestStatus;

  @Column({ type: 'timestamptz' })
  expires_at: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;
}

