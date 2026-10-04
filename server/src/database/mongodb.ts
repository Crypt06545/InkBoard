import 'dotenv/config';
import { MongooseModule } from '@nestjs/mongoose';

export const MongoDbModule = MongooseModule.forRoot(process.env.MONGO_URI!, {
  dbName: 'Zuhr',
  onConnectionCreate: (connection) => {
    connection.on('connected', () => console.log('✅ MongoDB connected'));
    connection.on('error', (err: Error) =>
      console.error('❌ MongoDB error:', err.message),
    );
  },
});
