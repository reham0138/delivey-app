# Crown & Anchor — Backend API

NestJS + MongoDB (Mongoose) implementation of `docs/API_CONTRACT.md`.
Base URL: `/api/v1`. Swagger UI: `/api/docs`.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values (never commit .env)
npm run start:dev
```

The app fails fast at boot if a required env var is missing — see `.env.example`.

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Dev server with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run lint` | ESLint |
| `npm test` | Jest unit tests |

## Layout

```
src/
  main.ts                 bootstrap: prefix /api/v1, helmet, CORS, pipes, filter, Swagger
  app.module.ts           root module
  config/                 env validation (fail fast)
  database/               Mongoose connection + global schema plugin (id instead of _id, timestamps)
  common/
    enums/                Role, AccountStatus, OrderStatus, PaymentMethod, PaymentStatus, CancellationActor
    errors/               ErrorCode enum + AppException helper
    filters/              AllExceptionsFilter -> contract error shape
    decorators/           @Roles(), @CurrentUser()
    dto/                  PaginationQueryDto, paginated response types
    utils/                paginate() helper
    interfaces/           AuthUser
  modules/
    health/               GET /api/v1/health -> { "status": "ok" }
    auth|users|categories|restaurants|menu-items|orders|reviews|admin|uploads/   (skeletons)
```

## Conventions worth knowing

- **Errors**: throw `new AppException(HttpStatus.X, ErrorCode.Y, 'message')`.
  The global filter always returns `{ statusCode, error, code, message, details? }`.
- **Validation**: the global `ValidationPipe` uses `whitelist` + `forbidNonWhitelisted`
  + `transform`; violations become `VALIDATION_ERROR` with `details: [{ field, message }]`.
- **Lists**: use `PaginationQueryDto` (`page`, `limit` ≤ 50) and `paginate(data, total, query)`
  to get the `{ data, meta: { total, page, limit, total_pages } }` envelope.
- **IDs**: every schema gets `id` (string) in JSON via the global Mongoose plugin;
  `_id`/`__v` are hidden and `createdAt`/`updatedAt` are automatic.
- **Auth building blocks**: `@Roles(...)` and `@CurrentUser()` exist, but the JWT
  strategy, guards (`JwtAuthGuard`, `RolesGuard`) and `@Public()` decorator arrive
  with the auth module. Until then, nothing is protected — add guards per route.
- **Rate limiting**: `@nestjs/throttler` is installed and configured
  (60 s window / 10 requests) but **not** applied globally. Apply
  `@Throttle()`/`@UseGuards(ThrottlerGuard)` on the auth routes when that module lands.
