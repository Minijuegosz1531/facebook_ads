/* eslint-disable @typescript-eslint/naming-convention */
import { IsOptional, IsString } from 'class-validator';

export class HiggsfieldCallbackDto {
  @IsString() request_id!: string;
  @IsString() image_url!: string;
  @IsOptional() @IsString() status?: string;
}
