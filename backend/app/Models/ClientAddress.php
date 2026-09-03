<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'client_id', 'label',
    'province_id', 'province_name',
    'regency_id', 'regency_name',
    'district_id', 'district_name',
    'village_id', 'village_name',
    'detail',
])]
class ClientAddress extends Model
{
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }
}
