/* eslint-disable @typescript-eslint/naming-convention */
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class StartInspirationDto {
  @IsString() client_id!: string;
  @IsString() client_name!: string;
  @IsString() product!: string;
  @IsString() @Length(10, 500) description!: string;
  @IsString() objective!: string;
  @IsString() @Length(2, 2) country!: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) platforms?: string[];
  @IsOptional() @IsInt() @Min(1) @Max(20) image_count?: number;
  @IsOptional() @IsInt() @Min(1) @Max(50) copy_count?: number;
}
