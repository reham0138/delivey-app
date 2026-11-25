import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { validateEnv } from './config/env.validation'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // Behind Render's proxy every request arrives from the proxy IP, so without
  // this the per-IP rate limiter would see all users as one client. Trust
  // exactly one hop (production only) so req.ip uses X-Forwarded-For.
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1)
  }

  app.setGlobalPrefix('api/v1')
  app.use(helmet())
  app.enableCors({ origin: process.env.FRONTEND_URL })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new AllExceptionsFilter())

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Crown & Anchor API')
    .setDescription('Food delivery API — contract: docs/API_CONTRACT.md')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig))

  const env = validateEnv(process.env)
  // Render requires listening on all interfaces.
  await app.listen(env.PORT, '0.0.0.0')
}

void bootstrap()
