# HSTS BACKEND:
Enviroment: .Net 8.0
Database: MySQL 8.0.36 Debian

## Code First:
Turn on terminal in Infrastructure:

- Create Migration: 
-> dotnet ef migrations add <NameMigrations> -o Migrations

eg: dotnet ef migrations add InitialCreate -o Migrations

- Apply Migration:
-> dotnet ef database update

If have error run this command: 
dotnet tool install --global dotnet-ef --version <Version number>

##### !Focus
User entity is example, do not remove BaseEntity and Logging package.
Do not remove any Log file.

## Explain Layers:
- Get appsetting.json from non-git source. See last file to know what must be fill.

# Domain Layer:
- Contains pure business rules (core business logic).

- Contains Entities: the main domain objects (e.g., User, Product).

- Contains Value Objects: immutable objects that represent a value (e.g., Email, Money).

- Contains Enums and Exceptions related to business logic.

# Application Layer:
- Contains interfaces for repositories, unit of work, and services (which will be implemented in lower layers).

- Contains Use Cases / Higher-level Business Logic (e.g., CreateOrder, RegisterUser).

- Contains DTOs (Data Transfer Objects) for exchanging data between the API layer and the domain layer.

- Contains CQRS / MediatR handlers and Validators (e.g., FluentValidation).

# Infrastructure Layer:
- Implements the interfaces defined in the Application layer, such as Repository and Unit of Work.

- Contains DbContext, EF Core, MySQL, and entity mappings (Code-First / Fluent API).

- Contains integrations with external services (HTTP clients, file storage, SMTP, etc.).

- Contains migrations and database configuration.

# API Layer:
- Receives requests from the client (HTTP, Web).

- Translates the request into a command/query and calls the Application layer.

- Returns data to the client (JSON, XML, etc.).

- Contains Controllers, Middleware, Swagger, and Dependency Injection (DI).

###### appsetting.json
{
    "Logging": {
        "LogLevel": {
            "Default": "Information",
            "Microsoft.AspNetCore": "Warning"
        }
    },
    "AllowedHosts": "*",

    "ConnectionStrings": {
        "DefaultConnection": "<YourconnectionString>"
    }
}
######

###### Library in project:
- ErrorOr
- FluentValidation
- MediaR
- EntityFrameworkCore
- Pomelo MySQL
