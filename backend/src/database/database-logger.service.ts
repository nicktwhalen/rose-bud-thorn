import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DatabaseLoggerService {
  private readonly logger = new Logger('DatabaseConnection');

  logConnectionAttempt(config: any) {
    this.logger.log('🔄 Attempting database connection...');
    this.logger.log(`📍 Host: ${config.host || 'undefined'}`);
    this.logger.log(`🔌 Port: ${config.port || 'undefined'}`);
    this.logger.log(`👤 Username: ${config.username || 'undefined'}`);
    this.logger.log(`🗄️  Database: ${config.database || 'undefined'}`);
    this.logger.log(`🔒 Password: ${config.password ? '[SET]' : '[NOT SET]'}`);

    // Log all environment variables related to database
    this.logger.log('🌍 Environment variables:');
    this.logger.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    this.logger.log(`   DB_HOST: ${process.env.DB_HOST || 'undefined'}`);
    this.logger.log(`   DB_PORT: ${process.env.DB_PORT || 'undefined'}`);
    this.logger.log(`   DB_USERNAME: ${process.env.DB_USERNAME || 'undefined'}`);
    this.logger.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '[SET]' : '[NOT SET]'}`);
    this.logger.log(`   DB_DATABASE: ${process.env.DB_DATABASE || 'undefined'}`);
    this.logger.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : '[NOT SET]'}`);
  }

  logConnectionSuccess() {
    this.logger.log('✅ Database connection established successfully');
  }

  logConnectionError(error: any) {
    this.logger.error('❌ Database connection failed');
    this.logger.error(`📋 Error code: ${error.code || 'unknown'}`);
    this.logger.error(`📄 Error message: ${error.message || 'unknown'}`);
    this.logger.error(`🏠 Error hostname: ${error.hostname || 'unknown'}`);
    this.logger.error(`🔌 Error port: ${error.port || 'unknown'}`);
    this.logger.error(`📍 Error address: ${error.address || 'unknown'}`);
    this.logger.error(`🌐 Error syscall: ${error.syscall || 'unknown'}`);

    if (error.code === 'ENETUNREACH') {
      this.logger.error('🔍 ENETUNREACH indicates network is unreachable');
      this.logger.error('   This often means:');
      this.logger.error('   - Invalid hostname/IP address');
      this.logger.error('   - IPv6 address used where IPv4 expected');
      this.logger.error('   - Network routing issues');
      this.logger.error('   - Firewall blocking connection');
    }

    this.logger.error('📊 Full error object:', JSON.stringify(error, null, 2));
  }
}
