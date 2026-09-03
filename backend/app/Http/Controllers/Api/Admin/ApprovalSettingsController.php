<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ApprovalStep;
use App\Models\Tenant;
use App\Models\TenantRolePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApprovalSettingsController extends Controller
{
    /**
     * Whether this tenant requires approval at all, and if so, the ordered
     * chain of roles that must sign off — empty steps with requires_approval
     * on means the legacy single flat-permission approve still applies.
     */
    public function show(Tenant $tenant)
    {
        return response()->json([
            'success' => true,
            'data' => $this->payload($tenant),
            'message' => null,
        ]);
    }

    public function update(Request $request, Tenant $tenant)
    {
        $data = $request->validate([
            'requires_approval' => ['required', 'boolean'],
            'steps' => ['array'],
            'steps.*.role' => ['required', 'string', 'max:50'],
            'steps.*.label' => ['nullable', 'string', 'max:255'],
        ]);

        $steps = array_values($data['steps'] ?? []);

        $activeRoles = User::where('tenant_id', $tenant->id)->distinct()->pluck('role')->all();
        $warnings = [];

        foreach ($steps as $step) {
            if (! in_array($step['role'], $activeRoles, true)) {
                $warnings[] = "Role \"{$step['role']}\" belum dipakai akun manapun di tenant ini — tambahkan akunnya di tab Pengguna.";

                continue;
            }

            $custom = TenantRolePermission::where('tenant_id', $tenant->id)->where('role', $step['role'])->pluck('permission');
            $effective = $custom->isNotEmpty() ? $custom : collect(config("permissions.{$step['role']}", []));

            if (! $effective->contains('transactions.approve')) {
                $warnings[] = "Role \"{$step['role']}\" belum punya permission \"transactions.approve\" — beri lewat tab Roles & Permission agar bisa benar-benar approve.";
            }
        }

        DB::transaction(function () use ($tenant, $data, $steps) {
            $tenant->update(['requires_approval' => $data['requires_approval']]);

            ApprovalStep::where('tenant_id', $tenant->id)->delete();

            foreach ($steps as $index => $step) {
                ApprovalStep::create([
                    'tenant_id' => $tenant->id,
                    'sequence' => $index + 1,
                    'role' => $step['role'],
                    'label' => $step['label'] ?? null,
                ]);
            }
        });

        return response()->json([
            'success' => true,
            'data' => $this->payload($tenant->fresh()),
            'warnings' => $warnings,
            'message' => 'Pengaturan approval berhasil disimpan.',
        ]);
    }

    private function payload(Tenant $tenant): array
    {
        return [
            'requires_approval' => $tenant->requires_approval,
            'steps' => ApprovalStep::where('tenant_id', $tenant->id)
                ->orderBy('sequence')
                ->get(['id', 'sequence', 'role', 'label']),
        ];
    }
}
