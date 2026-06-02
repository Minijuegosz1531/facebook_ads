import { IsIn } from 'class-validator';

export class UpdateStatusDto {
  @IsIn(['ACTIVE', 'PAUSED', 'ARCHIVED'])
  status!: 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}
