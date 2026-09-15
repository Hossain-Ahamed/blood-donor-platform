import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  admin_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin: User;

  @Column()
  action: string;

  @Column()
  target_type: string;

  @Column('uuid')
  target_id: string;

  @Column({ type: 'jsonb', nullable: true })
  meta: any;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}

