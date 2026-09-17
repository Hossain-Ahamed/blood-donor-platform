import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Response } from './response.entity';

@Entity('donations')
export class Donation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { unique: true })
  response_id: string;

  @OneToOne(() => Response, (response) => response.donation)
  @JoinColumn({ name: 'response_id' })
  response: Response;

  @Column({ type: 'date' })
  donation_date: Date;

  @Column({ default: false })
  confirmed_by_donor: boolean;

  @Column({ default: false })
  confirmed_by_requester: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;
}

