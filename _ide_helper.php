<?php
/**
 * Laravel IDE Helper Stubs for Intelephense
 * File ini hanya dibaca oleh IDE (Intelephense) untuk menghilangkan garis kuning (Undefined type/method)
 * dan tidak pernah dieksekusi saat runtime karena dibungkus dalam blok `if (false)`.
 */

namespace {
    if (false) {
        function now($tz = null): \Illuminate\Support\Carbon { return new \Illuminate\Support\Carbon(); }
        function view(?string $view = null, array $data = [], array $mergeData = []): \Illuminate\View\View { return new \Illuminate\View\View(); }
        function collect($value = []): \Illuminate\Support\Collection { return new \Illuminate\Support\Collection(); }
        function redirect(?string $to = null, int $status = 302, array $headers = [], ?bool $secure = null): \Illuminate\Http\RedirectResponse { return new \Illuminate\Http\RedirectResponse(); }
        function back(int $status = 302, array $headers = [], $fallback = false): \Illuminate\Http\RedirectResponse { return new \Illuminate\Http\RedirectResponse(); }
        function route(string $name, $parameters = [], bool $absolute = true): string { return ''; }
        function asset(string $path, ?bool $secure = null): string { return ''; }
        function auth(?string $guard = null) { return new class { public function id(): ?int { return 1; } }; }
    }
}

namespace Illuminate\Support {
    if (false) {
        class Carbon {
            public function format(string $format): string { return ''; }
            public function toDateString(): string { return ''; }
        }

        class Collection implements \IteratorAggregate {
            public function getIterator(): \Traversable { return new \ArrayIterator([]); }
            public function filter(?callable $callback = null): self { return $this; }
            public function values(): self { return $this; }
            public function isEmpty(): bool { return false; }
            public function first(?callable $callback = null, $default = null) { return null; }
            public function firstWhere(string $key, $operator = null, $value = null) { return null; }
            public function map(callable $callback): self { return $this; }
        }

        class Str {
            public static function random(int $length = 16): string { return ''; }
        }

        class Js {
            public static function from($data, int $flags = 0, int $depth = 512): string { return ''; }
        }

        abstract class ServiceProvider {
            public function register(): void {}
            public function boot(): void {}
        }
    }
}

namespace Illuminate\Http {
    if (false) {
        class UploadedFile {
            public function store(string $path = '', $options = []): string { return ''; }
        }

        class Request {
            public static function capture(): self { return new self(); }
            public function query(?string $key = null, $default = null) { return $default; }
            public function validate(array $rules, array $messages = [], array $attributes = []): array { return []; }
            public function file(?string $key = null, $default = null): UploadedFile { return new UploadedFile(); }
        }

        class RedirectResponse {
            public function route(string $route, $parameters = [], int $status = 302, array $headers = []): self { return $this; }
            public function with($key, $value = null): self { return $this; }
        }
    }
}

namespace Illuminate\View {
    if (false) {
        class View {}
    }
}

namespace Illuminate\Validation {
    if (false) {
        class ValidationException extends \Exception {
            public static function withMessages(array $messages): self { return new self(); }
        }
    }
}

namespace Illuminate\Support\Facades {
    if (false) {
        class DB {
            public static function transaction(\Closure $callback, int $attempts = 1) { return $callback(); }
        }

        class Auth {
            public static function id(): ?int { return 1; }
        }

        class Route {
            public static function get(string $uri, $action = null): self { return new self(); }
            public static function post(string $uri, $action = null): self { return new self(); }
            public static function patch(string $uri, $action = null): self { return new self(); }
            public static function prefix(string $prefix): self { return new self(); }
            public function name(string $name): self { return $this; }
            public function group(\Closure $callback): self { return $this; }
        }

        class Schema {
            public static function create(string $table, \Closure $callback): void {}
            public static function dropIfExists(string $table): void {}
        }
    }
}

namespace Illuminate\Database\Schema {
    if (false) {
        class ColumnDefinition {
            public function unique($indexName = null): self { return $this; }
            public function nullable(bool $value = true): self { return $this; }
            public function default($value): self { return $this; }
            public function constrained(?string $table = null, ?string $column = 'id', ?string $indexName = null): self { return $this; }
            public function cascadeOnDelete(): self { return $this; }
            public function restrictOnDelete(): self { return $this; }
            public function nullOnDelete(): self { return $this; }
        }

        class Blueprint {
            public function id(string $column = 'id'): ColumnDefinition { return new ColumnDefinition(); }
            public function foreignId(string $column): ColumnDefinition { return new ColumnDefinition(); }
            public function string(string $column, ?int $length = null): ColumnDefinition { return new ColumnDefinition(); }
            public function text(string $column): ColumnDefinition { return new ColumnDefinition(); }
            public function unsignedInteger(string $column, bool $autoIncrement = false): ColumnDefinition { return new ColumnDefinition(); }
            public function boolean(string $column): ColumnDefinition { return new ColumnDefinition(); }
            public function date(string $column): ColumnDefinition { return new ColumnDefinition(); }
            public function timestamp(string $column, ?int $precision = 0): ColumnDefinition { return new ColumnDefinition(); }
            public function enum(string $column, array $allowed): ColumnDefinition { return new ColumnDefinition(); }
            public function rememberToken(): ColumnDefinition { return new ColumnDefinition(); }
            public function timestamps(?int $precision = 0): void {}
            public function index($columns, ?string $name = null, ?string $algorithm = null): ColumnDefinition { return new ColumnDefinition(); }
            public function unique($columns, ?string $name = null, ?string $algorithm = null): ColumnDefinition { return new ColumnDefinition(); }
        }
    }
}

namespace Illuminate\Database\Migrations {
    if (false) {
        abstract class Migration {}
    }
}

namespace Illuminate\Database {
    if (false) {
        abstract class Seeder {
            public function call($class, bool $silent = false, array $parameters = []): self { return $this; }
        }
    }
}

namespace Illuminate\Database\Eloquent\Factories {
    if (false) {
        trait HasFactory {}
    }
}

namespace Illuminate\Database\Eloquent\Relations {
    if (false) {
        class HasMany {
            public function create(array $attributes = []) { return null; }
        }
        class BelongsTo {}
        class BelongsToMany {
            public function withPivot($columns): self { return $this; }
            public function withTimestamps($createdAt = null, $updatedAt = null): self { return $this; }
        }
    }
}

namespace Illuminate\Database\Eloquent {
    if (false) {
        class Collection extends \Illuminate\Support\Collection {}

        class Builder {
            public function with($relations, $callback = null): self { return $this; }
            public function where($column, $operator = null, $value = null, string $boolean = 'and'): self { return $this; }
            public function whereDate($column, $operator, $value = null, string $boolean = 'and'): self { return $this; }
            public function orderBy(string $column, string $direction = 'asc'): self { return $this; }
            public function latest(?string $column = null): self { return $this; }
            public function lockForUpdate(): self { return $this; }
            public function selectRaw(string $expression, array $bindings = []): self { return $this; }
            public function get($columns = ['*']): Collection { return new Collection(); }
            public function first($columns = ['*']) { return null; }
            public function firstOrFail($columns = ['*']) { return null; }
            public function findOrFail($id, $columns = ['*']) { return null; }
            public function paginate(?int $perPage = null, array $columns = ['*'], string $pageName = 'page', ?int $page = null) { return new Collection(); }
            public function create(array $attributes = []) { return null; }
            public function updateOrCreate(array $attributes, array $values = []) { return null; }
            public function firstOrCreate(array $attributes = [], array $values = []) { return null; }
            public function increment(string $column, $amount = 1, array $extra = []): int { return 1; }
            public function decrement(string $column, $amount = 1, array $extra = []): int { return 1; }
        }

        abstract class Model {
            protected $table;
            protected $fillable = [];
            protected $hidden = [];
            protected $casts = [];

            public static function with($relations): Builder { return new Builder(); }
            public static function where($column, $operator = null, $value = null): Builder { return new Builder(); }
            public static function whereDate($column, $operator, $value = null): Builder { return new Builder(); }
            public static function findOrFail($id, $columns = ['*']): static { return new static(); }
            public static function create(array $attributes = []): static { return new static(); }
            public static function updateOrCreate(array $attributes, array $values = []): static { return new static(); }
            public static function firstOrCreate(array $attributes = [], array $values = []): static { return new static(); }

            public function update(array $attributes = [], array $options = []): bool { return true; }
            public function increment(string $column, $amount = 1, array $extra = []): int { return 1; }
            public function decrement(string $column, $amount = 1, array $extra = []): int { return 1; }

            public function hasMany(string $related, ?string $foreignKey = null, ?string $localKey = null): Relations\HasMany { return new Relations\HasMany(); }
            public function belongsTo(string $related, ?string $foreignKey = null, ?string $ownerKey = null, ?string $relation = null): Relations\BelongsTo { return new Relations\BelongsTo(); }
            public function belongsToMany(string $related, ?string $table = null, ?string $foreignPivotKey = null, ?string $relatedPivotKey = null): Relations\BelongsToMany { return new Relations\BelongsToMany(); }
        }
    }
}

namespace Illuminate\Notifications {
    if (false) {
        trait Notifiable {}
    }
}

namespace Illuminate\Foundation\Auth {
    if (false) {
        class User extends \Illuminate\Database\Eloquent\Model {}
    }
}

namespace Illuminate\Foundation\Configuration {
    if (false) {
        class Exceptions {}
        class Middleware {}
    }
}

namespace Illuminate\Foundation {
    if (false) {
        class Application {
            public static function configure(?string $basePath = null): self { return new self(); }
            public function withRouting(?string $web = null, ?string $commands = null, ?string $health = null): self { return $this; }
            public function withMiddleware(?\Closure $callback = null): self { return $this; }
            public function withExceptions(?\Closure $callback = null): self { return $this; }
            public function create(): self { return $this; }
            public function handleCommand($input): int { return 0; }
            public function handleRequest($request): void {}
        }
    }
}

namespace Symfony\Component\Console\Input {
    if (false) {
        class ArgvInput {}
    }
}

