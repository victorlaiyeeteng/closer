import { DataSource } from 'typeorm';
import { User } from './entity/User';
import { Post } from './entity/Post';
import 'dotenv/config';
import { PartnerRequest } from './entity/PartnerRequest';
import { Question } from './entity/Question';


export const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    database: process.env.DB_NAME,
    synchronize: true,
    logging: false,
    entities: [User, Post, PartnerRequest, Question],
    migrations: [],
    subscribers: [],
});