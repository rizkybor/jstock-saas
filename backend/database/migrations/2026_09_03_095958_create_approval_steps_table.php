<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The ordered chain of who must approve a transaction for a tenant that
     * has requires_approval on — role-based so it composes with the tenant's
     * dynamic (Super-Admin-managed) role list. No rows for a tenant means
     * the legacy single flat-permission approve still applies.
     */
    public function up(): void
    {
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->string('role', 50);
            $table->string('label')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'sequence']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_steps');
    }
};
