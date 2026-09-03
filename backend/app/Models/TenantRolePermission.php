<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['tenant_id', 'role', 'permission'])]
class TenantRolePermission extends Model
{
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
