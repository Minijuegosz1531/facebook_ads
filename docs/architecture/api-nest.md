# `apps/api-nest` — NestJS 11 · TypeScript

Reimplementación de la API en NestJS, aprovechando sus primitivas (módulos,
decoradores, DI por símbolo, pipes, filtros, interceptores). Runnable en modo
stub.

Para los patrones concretos del código y dónde están, ver
[`../patterns.md`](../patterns.md). Para la teoría compartida,
[`README.md`](README.md).

---

## Stack

| Pieza | Tecnología |
|---|---|
| Runtime | Node 22, TypeScript 5.7 (estricto) |
| Framework | NestJS 11 (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`) |
| Config | `@nestjs/config` |
| Validación | `class-validator` + `class-transformer` + `ValidationPipe` global |
| Tests | Jest + `@nestjs/testing` + `supertest` (unit + e2e) |

---

## Layout

```
apps/api-nest/
└── src/
    ├── main.ts                           # bootstrap + ValidationPipe global
    ├── app.module.ts                     # root module (composition)
    ├── domain/                           # NÚCLEO sin frameworks (salvo @Injectable/@Inject)
    │   ├── models/                       # interfaces + CampaignBuilder
    │   ├── errors/domain.errors.ts       # NotFoundError, ValidationError, …
    │   ├── ports/*.port.ts               # interfaces TS + Symbol tokens
    │   └── use-cases/*.use-case.ts       # @Injectable, inyectan ports por @Inject(TOKEN)
    ├── application/
    │   ├── campaigns.service.ts          # facade sobre use cases
    │   ├── inspiration.service.ts
    │   └── application.module.ts         # provee use cases + services
    ├── adapters/
    │   ├── inbound/http/
    │   │   ├── controllers/              # @Controller, métodos @Get/@Post/...
    │   │   ├── dto/                      # class-validator (@IsString, @Length, …)
    │   │   ├── mappers/api.mapper.ts     # model interno → wire snake_case
    │   │   ├── filters/                  # DomainExceptionFilter (@Catch(DomainError))
    │   │   └── interceptors/             # LoggingInterceptor
    │   └── outbound/stub/                # implementaciones in-memory de todos los ports
    ├── infrastructure/
    │   └── ports.module.ts               # @Global(): liga cada Symbol a una clase concreta
    └── modules/                          # módulos HTTP por recurso
        ├── campaigns.module.ts
        ├── inspiration.module.ts
        ├── clients.module.ts
        ├── webhooks.module.ts
        └── health.module.ts
```

---

## Capa por capa

### 1. Dominio — `src/domain/`

**Qué contiene:**
- `models/`: interfaces TS para los datos (`Campaign`, `Client`, `InspirationJob`) — son shapes puros, sin lógica.
- `models/campaign.builder.ts`: la clase `CampaignBuilder` con API fluida y `build()` que valida.
- `errors/domain.errors.ts`: jerarquía `DomainError` con subclases (`NotFoundError`, `ValidationError`, `InvalidStateError`, `AdPlatformError`).
- `ports/*.port.ts`: **una interfaz por archivo, con su `Symbol` token al lado**:

  ```ts
  export const AD_PLATFORM = Symbol('AdPlatformPort');
  export interface AdPlatformPort { ... }
  ```

- `use-cases/*.use-case.ts`: clases `@Injectable()` con `@Inject(TOKEN)` en el constructor. Una clase por intención + su `*Command` interface co-localizado.

**Qué NO contiene:**
- Imports de `express`, SDKs, BD, ni nada de `@nestjs/*` excepto `@Injectable`/`@Inject` (decoradores que son solo metadata).

**Idioma NestJS aplicado:**

#### Por qué `Symbol` y no la interfaz como token

TypeScript borra las interfaces en runtime — `AdPlatformPort` simplemente no
existe cuando el código corre, así que Nest no puede usarla como llave del DI
container. La solución idiomática: cada port exporta un `Symbol` (único por
identidad), y los consumidores lo inyectan con `@Inject(AD_PLATFORM)`. El tipo
TS se conserva para autocompletado y chequeos en tiempo de compilación.

```ts
constructor(
  @Inject(AD_PLATFORM) private readonly adPlatform: AdPlatformPort,
  @Inject(CAMPAIGN_REPOSITORY) private readonly repo: CampaignRepositoryPort,
) {}
```

#### Por qué `DomainError` en lugar de `HttpException`

Si el use case lanza `HttpException`, Nest se cuela en el dominio. En su lugar,
el use case lanza `NotFoundError("Campaign x not found")` y el
`DomainExceptionFilter` lo traduce a 404 una sola vez. El dominio no sabe que
existe HTTP.

---

### 2. Aplicación — `src/application/`

**`campaigns.service.ts`** e **`inspiration.service.ts`** son `@Injectable()`
que **inyectan los use cases** por su tipo concreto (Nest puede resolver clases
directamente, sin tokens, porque son providers identificables en runtime). El
service es el seam público que los controllers consumen.

**`application.module.ts`** declara use cases + services en `providers` y
exporta los services. Los módulos HTTP que necesitan un service importan este
módulo.

---

### 3. Adapters inbound — `src/adapters/inbound/http/`

#### Controllers
Solo deciden HTTP: ruta, método, status. Validan con DTO, llaman al service,
mapean a wire.

```ts
@Patch(':id/status')
async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
  return toCampaignResponse(await this.campaigns.updateStatus(id, dto.status));
}
```

#### DTOs (`dto/*.dto.ts`)
Clases con decoradores de `class-validator`: `@IsString`, `@Length(3,100)`,
`@IsIn(['ACTIVE','PAUSED','ARCHIVED'])`. La validación es **declarativa** y
corre antes de que el método del controller se invoque, gracias al
`ValidationPipe` global.

**Snake_case en wire**: las propiedades de los DTOs son `snake_case`
(`meta_ad_account_id`, `image_index`) para compatibilidad. El controller mapea
a `camelCase` al construir el command que pasa al service.

#### Mappers (`mappers/api.mapper.ts`)
Funciones `toCampaignResponse`, `toJobResponse`, `toClientResponse`. Convierten
modelos internos (camelCase) a wire (snake_case) en un solo lugar. Si la
representación interna cambia, este archivo es el único que se actualiza.

#### Filtros (`filters/domain-exception.filter.ts`)
`@Catch(DomainError)`: mapea las subclases de `DomainError` a status HTTP.

```ts
private statusFor(err: DomainError): number {
  if (err instanceof NotFoundError) return HttpStatus.NOT_FOUND;
  if (err instanceof ValidationError) return HttpStatus.BAD_REQUEST;
  if (err instanceof InvalidStateError) return HttpStatus.BAD_REQUEST;
  if (err instanceof AdPlatformError) return HttpStatus.BAD_GATEWAY;
  return HttpStatus.INTERNAL_SERVER_ERROR;
}
```

Registrado **globalmente** en `app.module.ts` con `{ provide: APP_FILTER, useClass: DomainExceptionFilter }`.

#### Interceptors (`interceptors/logging.interceptor.ts`)
Wrap each handler con logs de método/path/status/latencia. Decorator
("around-advice") aplicado vía `{ provide: APP_INTERCEPTOR, useClass: ... }`.

---

### 4. Adapters outbound — `src/adapters/outbound/stub/`

Una clase por port, todas `@Injectable()`. La clase **implementa** la
interfaz TS del port (Nest la trata como un provider normal — el binding al
Symbol lo hace el `PortsModule`).

```ts
@Injectable()
export class InMemoryCampaignRepository implements CampaignRepositoryPort { ... }
```

Hoy solo hay stubs (la API es de estudio); el seam para reales es claro: añadir
`postgres-campaign-repository.ts` que implemente la misma interfaz y cambiar
`useClass` en `PortsModule`.

---

### 5. Infraestructura / composition root — `src/infrastructure/ports.module.ts`

`@Global()` significa que cualquier módulo puede inyectar estos providers sin
volver a importarlo. Define el binding `Symbol → clase concreta`:

```ts
@Global()
@Module({
  providers: [
    { provide: AD_PLATFORM, useClass: StubAdPlatform },
    { provide: CAMPAIGN_REPOSITORY, useClass: InMemoryCampaignRepository },
    // ...
  ],
  exports: [AD_PLATFORM, CAMPAIGN_REPOSITORY, ...],
})
export class PortsModule {}
```

Cambiar a producción es cambiar `useClass: StubAdPlatform` por
`useClass: MetaCLIAdapter`, o pasar a `useFactory` para elegir por config:

```ts
{
  provide: AD_PLATFORM,
  inject: [ConfigService],
  useFactory: (cfg: ConfigService) =>
    cfg.get('USE_STUBS') ? new StubAdPlatform() : new MetaCLIAdapter(...),
}
```

**`app.module.ts`** importa `PortsModule`, `ApplicationModule` y los módulos
HTTP por recurso. Registra el filtro global y el interceptor global con
`APP_FILTER` / `APP_INTERCEPTOR`.

**`main.ts`** monta el `ValidationPipe` global con:

```ts
new ValidationPipe({
  whitelist: true,            // ignora props no declaradas
  forbidNonWhitelisted: true, // 400 si llegan extras
  transform: true,            // convierte plain JSON a instancias
})
```

---

## Idiomas específicos de NestJS que se ven aquí

- **Decoradores como pegamento**: `@Controller`, `@Get/@Post/@Patch`, `@Body`, `@Param`, `@Query`, `@Inject`, `@Module`, `@Injectable`, `@Global`, `@Catch`. El wiring es declarativo y leíble.
- **Módulos como límites de visibilidad**: `providers` interno, `exports` público. Cambiar el grafo de DI es cambiar listas en `@Module`.
- **Inyección por clase O por símbolo** — clases directamente, interfaces vía `Symbol` + `@Inject`.
- **Pipes / Filters / Interceptors / Guards** como capas transversales. Pipe = validación. Filter = mapeo de errores. Interceptor = around-advice. Guard = autorización (no usado aquí).
- **Background fire-and-forget** con `void promise.catch(...)`: el handler devuelve 202 sin esperar.
- **Concurrencia con `Promise.all`** para las llamadas independientes (imágenes ∥ copies), el análogo del `WaitGroup` de Go.

---

## Diagrama: una request real recorre las capas

`POST /campaigns/publish-from-job`:

```
HTTP
  ▼
[Inbound HTTP] CampaignsController.publishFromJob(dto)
       │ ValidationPipe valida PublishFromJobDto (class-validator)
       │ mapea snake_case → camelCase → SelectAndPublishCommand
       ▼
[Application] CampaignsService.publishFromJob(cmd)
       ▼
[Dominio] SelectAndPublishUseCase.execute(cmd)
       ├─ jobStore.get(...)               ─┐  @Inject(JOB_STORE)
       ├─ valida estado (ready?)            │
       └─ CreateCampaignUseCase.execute     │  @Inject(AD_PLATFORM, CAMPAIGN_REPOSITORY)
             ├─ adPlatform.createCampaign   │
             └─ repo.save(...)              ─┘
       ▼
[Outbound] PortsModule resuelve: StubAdPlatform / InMemoryCampaignRepository / ...
       ▲
[Inbound HTTP] toCampaignResponse(c) → 201 JSON snake_case
       │ si error: DomainExceptionFilter mapea NotFoundError→404, ValidationError→400
       │ LoggingInterceptor escribe: POST /campaigns/publish-from-job → 201 (12ms)
```

---

## Pruebas — qué se prueba en cada capa

| Capa | Tipo de test | Archivos |
|---|---|---|
| Use cases | unit instanciando la clase con stubs directos (sin Nest) | `src/domain/use-cases/create-campaign.use-case.spec.ts` |
| HTTP completo | e2e con `@nestjs/testing` + `supertest` | `test/api.e2e-spec.ts` |

El unit test de use case NO usa el TestingModule de Nest — instancia la clase
con `new CreateCampaignUseCase(new StubAdPlatform(), new InMemoryCampaignRepository())`.
Es la prueba de que la capa de dominio realmente no depende del framework.
