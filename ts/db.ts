import { MongoClient } from "mongodb";
import "dotenv/config";

const client = new MongoClient(process.env.DB_URI as string);
const db = client.db(process.env.DB_NAME as string);

export default db;