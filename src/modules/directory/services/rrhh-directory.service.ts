import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import axios, { AxiosInstance } from 'axios';

import { EnvironmentVariables } from 'src/config';

export interface RrhhAuthority {
  name: string;
  position: string;
  unit: string;
  area: string;
  level: number;
}

@Injectable()
export class RrhhDirectoryService {
  private readonly client: AxiosInstance;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    const baseURL = configService.getOrThrow('RRHH_INTEGRATION_URL', { infer: true });
    const accessCode = configService.getOrThrow('RRHH_ACCESS_CODE', { infer: true });

    this.client = axios.create({
      baseURL,
      headers: {
        'x-access-code': accessCode,
      },
      timeout: 5_000,
    });
  }

  async getAuthorities(): Promise<RrhhAuthority[]> {
    try {
      const response = await this.client.get<RrhhAuthority[]>('/integration/authorities');
      return response.data;
    } catch {
      throw new ServiceUnavailableException('RRHH is temporarily unavailable');
    }
  }
}
