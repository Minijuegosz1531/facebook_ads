/* eslint-disable @typescript-eslint/naming-convention */
import { IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Min } from 'class-validator';

export class PublishFromJobDto {
  @IsString() job_id!: string;
  @IsString() client_id!: string;
  @IsString() ad_account_id!: string;
  @IsString() @Length(3, 100) name!: string;
  @IsString() objective!: string;
  @IsIn(['campaign', 'adset']) budget_type!: 'campaign' | 'adset';
  @IsInt() @Min(100) budget_amount!: number;
  @IsString() page_id!: string;
  @IsOptional() @IsString() pixel_id?: string | null;
  @IsUrl({ require_tld: false }) link_url!: string;
  @IsInt() @Min(0) image_index!: number;
  @IsInt() @Min(0) copy_index!: number;
}
