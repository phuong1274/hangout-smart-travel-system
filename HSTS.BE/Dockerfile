# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files first — Docker caches this layer until any .csproj changes
COPY HSTS.API/HSTS.API.csproj             HSTS.API/
COPY HSTS.Application/HSTS.Application.csproj   HSTS.Application/
COPY HSTS.Infrastructure/HSTS.Infrastructure.csproj HSTS.Infrastructure/
COPY HSTS.Domain/HSTS.Domain.csproj           HSTS.Domain/

RUN dotnet restore HSTS.API/HSTS.API.csproj

# Copy all source (HSTS.Tests excluded — not referenced by API)
COPY HSTS.API/       HSTS.API/
COPY HSTS.Application/ HSTS.Application/
COPY HSTS.Infrastructure/ HSTS.Infrastructure/
COPY HSTS.Domain/     HSTS.Domain/

RUN dotnet publish HSTS.API/HSTS.API.csproj \
    -c Release -o /app/publish

# Stage 2: Runtime (smaller image — no SDK)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "HSTS.API.dll"]
