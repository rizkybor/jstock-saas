<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Super Admin's per-tenant override of which menus a module exposes —
     * see Module::MENU_CATALOG for the fixed catalog per module key. A
     * missing row means "enabled" (the module's default); only overrides
     * that turn a menu off need a row.
     */
    public function up(): void
    {
        Schema::create('tenant_menu_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('module_key', 100);
            $table->string('menu_key', 50);
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'module_key', 'menu_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_menu_settings');
    }
};
