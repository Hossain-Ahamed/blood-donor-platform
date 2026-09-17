import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";

export enum NotificationType {
  DONOR_APPLIED = "DONOR_APPLIED",
  OFFER_ACCEPTED = "OFFER_ACCEPTED",
  OFFER_DECLINED = "OFFER_DECLINED",
  DONATION_CONFIRMED = "DONATION_CONFIRMED",
  GENERAL = "GENERAL",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column("uuid")
  user_id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({
    type: "varchar",
    length: 50,
    default: NotificationType.GENERAL,
  })
  type: NotificationType;

  @Column({ type: "varchar", length: 500, nullable: true })
  link: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;
}
