import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Communication, TypeCommunication } from '../entities';

@Injectable()
export class CommunicationReadService {
  constructor(
    @InjectRepository(Communication) private commRepository: Repository<Communication>,
    @InjectRepository(TypeCommunication) private typeCommRespository: Repository<TypeCommunication>,
  ) {}
}
