import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { ResponseStatus } from "@repo/shared";
import { BloodRequest } from "./request.entity";
import { User } from "./user.entity";

@Entity("responses")
@Unique(["request_id", "donor_id"])
export class Response {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  request_id: string;

  @ManyToOne(() => BloodRequest)
  @JoinColumn({ name: "request_id" })
  request: BloodRequest;

  @Column("uuid")
  donor_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: "donor_id" })
  donor: User;

  @Column({
    type: "enum",
    enum: ResponseStatus,
    default: ResponseStatus.OFFERED,
  })
  status: ResponseStatus;

  @Column({ type: "text", nullable: true })
  message: string;

  @Column({ type: "text", nullable: true })
  rejection_reason: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;
}
