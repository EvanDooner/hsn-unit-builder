import Armour from "../armour";
import {
  CompromiseName,
  ModificationName,
  ModificationType,
  MountLocation,
  UpgradeName,
  VehicleSize,
} from "../constants";
import { EmptyMount } from "../mount";
import {
  BehemothSponsonsMount,
  CoaxialMountType,
  HeavyArmMount,
  HeavyHullMount,
  HeavySponsonsMount,
  HeavyTurretMount,
  LightArmMount,
  LightHullMount,
  LightTurretMount,
  MountType,
  SuperheavyArmMount,
  SuperheavyHullMount,
  SuperheavySponsonsMount,
  SuperheavyTurretMount,
} from "../mount-type";
import Unit from "../unit";

export default interface ModificationShape {
  readonly type: ModificationType;
  readonly name: ModificationName;
  readonly cost: number;
  readonly compatibleVehicleSizes: VehicleSize[];
  readonly maxAllowed: number | null;
  readonly requiredSpecialRuleGroups: readonly string[];
  readonly excludedSpecialRuleGroups: readonly string[];
  readonly requiredMounts: readonly MountLocation[];
  readonly exclusiveModifications: readonly ModificationName[];
}

export abstract class Modification implements ModificationShape {
  abstract type: ModificationType;
  abstract name: ModificationName;
  abstract cost: number;
  abstract compatibleVehicleSizes: VehicleSize[];
  abstract maxAllowed: number | null;
  abstract requiredSpecialRuleGroups: readonly string[];
  abstract excludedSpecialRuleGroups: readonly string[];
  abstract requiredMounts: readonly MountLocation[];
  abstract exclusiveModifications: readonly ModificationName[];
  abstract applyModificationToUnit(unit: Unit): Unit;
  abstract costOfAppliedModification(unit: Unit, quantity: number): number;
  abstract costToApplyModification(unit: Unit): number;
  abstract maxAllowedForModification(unit: Unit): 1 | 2 | 3 | "no-limit" | "special";
  abstract uniqueRequirementsSatisfied(unit: Unit): boolean;

  isModValidForUnit(unit: Unit): boolean {
    return (
      this.hasLessThanMaxInstances(unit) &&
      unit.isOneOfSizes(this.compatibleVehicleSizes) &&
      this.meetsSpecialRuleRequirements(unit) &&
      unit.hasAtLeastOneOfMounts(this.requiredMounts) &&
      this.hasNoExclusiveModifications(unit) &&
      this.uniqueRequirementsSatisfied(unit)
    );
  }

  private hasNoExclusiveModifications(unit: Unit) {
    return (
      this.exclusiveModifications.length === 0 ||
      unit.modifications.every(
        (m) => !this.exclusiveModifications.includes(m.modification.name),
      )
    );
  }

  private meetsSpecialRuleRequirements(unit: Unit) {
    return (
      (this.requiredSpecialRuleGroups.length === 0 ||
        unit.special.some((s) =>
          this.requiredSpecialRuleGroups.some((req) => s.includes(req)),
        )) &&
      (this.excludedSpecialRuleGroups.length === 0 ||
        unit.special.every((s) =>
          this.excludedSpecialRuleGroups.every((ex) => !s.includes(ex)),
        ))
    );
  }

  private hasLessThanMaxInstances(unit: Unit) {
    const appliedQuantity = this.countInstancesAppliedToUnit(unit);
    if (appliedQuantity === 0) {
      return true;
    }

    const maxAllowed = this.maxAllowedForModification(unit);
    switch (maxAllowed) {
      case 1:
      case 2:
      case 3: {
        return appliedQuantity < maxAllowed;
      }
      case "no-limit":
      case "special": {
        return true;
      }
    }
  }

  countInstancesAppliedToUnit({ modifications }: Unit) {
    const appliedModification = modifications.find(
      (m) => m.modification.name === this.name,
    );
    
    if (appliedModification === undefined) {
      return 0;
    }
  
    return appliedModification.quantity
  }
}

export interface AppliedModification {
  readonly modification: ModificationShape;
  readonly quantity: number;
}

export const UnimplementedModifications: readonly ModificationName[] = [
  UpgradeName.ReinforcedMount,
  UpgradeName.SmokeBelcher,
  UpgradeName.TailGun,
  UpgradeName.TargetingProtocols,
  UpgradeName.TwinLinked,
  CompromiseName.MainGunRetrofit,
];

export function applyModificationToUnit(
  unit: Unit,
  modification: ModificationShape,
) {
  switch (modification.name) {
    case UpgradeName.AAWeaponConfiguration: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts.addSpecialOverride("Anti-Air");
      return modifiedUnit;
    }
    case UpgradeName.AdditionalSponsons: {
      const modifiedUnit = Unit.fromUnit(unit);

      let mountType: MountType;
      if (unit.size === VehicleSize.Superheavy) {
        mountType = SuperheavySponsonsMount;
      } else if (unit.size === VehicleSize.Behemoth) {
        mountType = BehemothSponsonsMount;
      } else {
        throw new Error(
          `AdditionalSponsons is invalid for ${unit.size} vehicles`,
        );
      }

      modifiedUnit.mounts = modifiedUnit.mounts.addMount(
        new EmptyMount(mountType, "AdditionalSponsons", [], true),
      );
      return modifiedUnit;
    }
    case UpgradeName.CoaxialMount: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts.addMount(
        new EmptyMount(CoaxialMountType, UpgradeName.CoaxialMount, [], true),
      );
      return modifiedUnit;
    }
    case UpgradeName.CommunicationsModule: {
      const turretAndArmMounts = unit.mounts.mounts
        .filter(
          (m) =>
            m.type.mountType === MountLocation.Turret ||
            m.type.mountType === MountLocation.Arm,
        )
        .toSorted((a, b) => b.id.localeCompare(a.id));

      if (turretAndArmMounts.length === 0) {
        throw new Error(
          "Cannot apply CommunicationsModule. No Arm or Turrent mount found",
        );
      }

      const mountToRemove = turretAndArmMounts[0];
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts.removeMountById(
        mountToRemove.id,
      );
      return modifiedUnit;
    }
    case UpgradeName.EnginePowerIncrease: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.movement += 1;
      return modifiedUnit;
    }
    case UpgradeName.EnhancedSensors: {
      if (unit.special.includes("Recce")) {
        return unit;
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.special = [
        ...modifiedUnit.special.filter((s) => s.localeCompare("Recce") < 0),
        "Recce",
        ...modifiedUnit.special.filter((s) => s.localeCompare("Recce") > 0),
      ];
      return modifiedUnit;
    }
    case UpgradeName.ImprovedHandling: {
      if (unit.special.includes("Fast")) {
        return unit;
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.special = [
        ...modifiedUnit.special.filter((s) => s.localeCompare("Fast") < 0),
        "Fast",
        ...modifiedUnit.special.filter((s) => s.localeCompare("Fast") > 0),
      ];
      return modifiedUnit;
    }
    case UpgradeName.IncendiaryAmmunition: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts.addSpecialOverride("Inferno");
      return modifiedUnit;
    }
    case UpgradeName.LowProfile: {
      if (unit.special.includes("Short")) {
        return unit;
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.special = [
        ...modifiedUnit.special.filter((s) => s.localeCompare("Short") < 0),
        "Short",
        ...modifiedUnit.special.filter((s) => s.localeCompare("Short") > 0),
      ];
      return modifiedUnit;
    }
    case UpgradeName.MineClearanceEquipment: {
      const turretFixedAndArmMounts = unit.mounts.mounts
        .filter(
          (m) =>
            m.type.mountType === MountLocation.Turret ||
            m.type.mountType === MountLocation.Arm ||
            m.type.mountType === MountLocation.Fixed,
        )
        .toSorted((a, b) => {
          const compareMountLocations = a.type.mountType.localeCompare(
            b.type.mountType,
          );

          if (compareMountLocations === 0) {
            return b.id.localeCompare(a.id);
          }

          return compareMountLocations;
        });

      if (turretFixedAndArmMounts.length === 0) {
        throw new Error(
          "Cannot apply MineClearanceEquipment. No Arm, Fixed or Turrent mount found",
        );
      }

      const mountToRemove = turretFixedAndArmMounts[0];
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts.removeMountById(
        mountToRemove.id,
      );
      return modifiedUnit;
    }
    case UpgradeName.OpticRefinement: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.optics += 2;
      return modifiedUnit;
    }
    case UpgradeName.ReinforcedFrontArmour: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.armour = new Armour(
        modifiedUnit.armour.front + 1,
        modifiedUnit.armour.sides,
        modifiedUnit.armour.rear,
      );
      return modifiedUnit;
    }
    case UpgradeName.ReinforcedSideArmour: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.armour = new Armour(
        modifiedUnit.armour.front,
        modifiedUnit.armour.sides === null
          ? null
          : modifiedUnit.armour.sides + 1,
        modifiedUnit.armour.rear,
      );
      return modifiedUnit;
    }
    case UpgradeName.ReinforcedRearArmour: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.armour = new Armour(
        modifiedUnit.armour.front,
        modifiedUnit.armour.sides,
        modifiedUnit.armour.rear === null ? null : modifiedUnit.armour.rear + 1,
      );
      return modifiedUnit;
    }
    case UpgradeName.RepulsorDrive: {
      if (unit.special.includes("Float")) {
        return unit;
      }

      const modifiedUnit = Unit.fromUnit(unit);
      const filteredSpecials = modifiedUnit.special.filter(
        (s) => s !== "Relentless" && s !== "Short",
      );
      modifiedUnit.special = [
        ...filteredSpecials.filter((s) => s.localeCompare("Float") < 0),
        "Float",
        ...filteredSpecials.filter((s) => s.localeCompare("Float") > 0),
      ];
      return modifiedUnit;
    }
    case UpgradeName.Resilient: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.morale += 1;
      return modifiedUnit;
    }
    case UpgradeName.SecondaryTurretMount: {
      const fixedMount = unit.mounts.mounts.find(
        (m) => m.type.mountType === MountLocation.Fixed,
      );

      if (fixedMount === undefined) {
        throw new Error(
          "Could not apply SecondaryTurretMount. No Fixed mount found",
        );
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts
        .removeMountById(fixedMount.id)
        .addMount(
          new EmptyMount(
            SuperheavyTurretMount,
            UpgradeName.SecondaryTurretMount,
            [],
            true,
          ),
        );
      return modifiedUnit;
    }
    case UpgradeName.ShoulderTurrets: {
      let sponsonMount: MountType;
      switch (unit.size) {
        case VehicleSize.Heavy: {
          sponsonMount = HeavySponsonsMount;
          break;
        }
        case VehicleSize.Superheavy: {
          sponsonMount = SuperheavySponsonsMount;
          break;
        }
        default: {
          throw new Error(
            `Cannot apply ShoulderTurrets upgrade to a ${unit.size} vehicle`,
          );
        }
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts.addMount(
        new EmptyMount(sponsonMount, UpgradeName.ShoulderTurrets, [], true),
      );
      return modifiedUnit;
    }
    case UpgradeName.SpotterRelay: {
      if (unit.special.includes("Scout")) {
        return unit;
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.special = [
        ...modifiedUnit.special.filter((s) => s.localeCompare("Scout") < 0),
        "Scout",
        ...modifiedUnit.special.filter((s) => s.localeCompare("Scout") > 0),
      ];
      return modifiedUnit;
    }
    case UpgradeName.TailGun: {
      let hullMount: MountType;
      switch (unit.size) {
        case VehicleSize.Light: {
          hullMount = LightHullMount;
          break;
        }
        case VehicleSize.Heavy: {
          hullMount = HeavyHullMount;
          break;
        }
        case VehicleSize.Superheavy: {
          hullMount = SuperheavyHullMount;
          break;
        }
        default: {
          throw new Error(
            `Cannot apply TailGun upgrade to a ${unit.size} vehicle`,
          );
        }
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts.addMount(
        new EmptyMount(hullMount, UpgradeName.TailGun, [], true),
      );
      return modifiedUnit;
    }
    case UpgradeName.ToughenedHull: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.hullPoints += 2;
      return modifiedUnit;
    }
    case UpgradeName.TurretGrabber: {
      const turretMount = unit.mounts.mounts.find(
        (m) => m.type.mountType === MountLocation.Turret,
      );

      if (turretMount === undefined) {
        throw new Error("Could not apply TurretGrabber. No Turret mount found");
      }

      let armMount: MountType;
      switch (unit.size) {
        case VehicleSize.Light: {
          armMount = LightArmMount;
          break;
        }
        case VehicleSize.Heavy: {
          armMount = HeavyArmMount;
          break;
        }
        case VehicleSize.Superheavy: {
          armMount = SuperheavyArmMount;
          break;
        }
        default: {
          throw new Error(
            `Cannot apply TurretGrabber upgrade to a ${unit.size} vehicle`,
          );
        }
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = modifiedUnit.mounts
        .removeMountById(turretMount.id)
        .addMount(
          new EmptyMount(armMount, UpgradeName.TurretGrabber, [], true),
        );
      return modifiedUnit;
    }
    case UpgradeName.UpperTurretConfiguration: {
      const armMounts = unit.mounts.mounts.filter(
        (m) => m.type.mountType === MountLocation.Arm,
      );

      if (armMounts.length === 0) {
        throw new Error(
          "Could not apply UpperTurretConfiguration. No Arm mounts found",
        );
      }

      let turretMount: MountType;
      switch (unit.size) {
        case VehicleSize.Light: {
          turretMount = LightTurretMount;
          break;
        }
        case VehicleSize.Heavy: {
          turretMount = HeavyTurretMount;
          break;
        }
        case VehicleSize.Superheavy: {
          turretMount = SuperheavyTurretMount;
          break;
        }
        default: {
          throw new Error(
            `Cannot apply UpperTurretConfiguration upgrade to a ${unit.size} vehicle`,
          );
        }
      }

      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.mounts = armMounts
        .reduce(
          (mountSet, arm) => mountSet.removeMountById(arm.id),
          modifiedUnit.mounts,
        )
        .addMount(
          new EmptyMount(
            turretMount,
            UpgradeName.UpperTurretConfiguration,
            [],
            true,
          ),
        );
      return modifiedUnit;
    }
    case UpgradeName.VeteranCrew: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.discipline += 1;
      return modifiedUnit;
    }
    case CompromiseName.EnginePowerReduction: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.movement -= 1;
      return modifiedUnit;
    }
    case CompromiseName.GreenCrew: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.discipline -= 1;
      return modifiedUnit;
    }
    case CompromiseName.LightFrontArmour: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.armour = new Armour(
        modifiedUnit.armour.front - 1,
        modifiedUnit.armour.sides,
        modifiedUnit.armour.rear,
      );
      return modifiedUnit;
    }
    case CompromiseName.LightSecondaryArmour: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.armour = new Armour(
        modifiedUnit.armour.front,
        modifiedUnit.armour.sides === null
          ? null
          : Math.max(modifiedUnit.armour.sides - 1, 0),
        modifiedUnit.armour.rear === null
          ? null
          : Math.max(modifiedUnit.armour.rear - 1, 0),
      );
      return modifiedUnit;
    }
    case CompromiseName.LowMorale: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.morale -= 1;
      return modifiedUnit;
    }
    case CompromiseName.PoorOptics: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.optics -= 1;
      return modifiedUnit;
    }
    case CompromiseName.WeakHull: {
      const modifiedUnit = Unit.fromUnit(unit);
      modifiedUnit.hullPoints -= 2;
      return modifiedUnit;
    }
    // No stat changes to apply (more or less)
    case UpgradeName.AbominableHorror:
    case UpgradeName.EarlyWarningRadarSystem:
    case UpgradeName.ExplosiveShielding:
    case UpgradeName.ImprovedCountermeasures:
    case UpgradeName.IndependentMovementSubroutines:
    case UpgradeName.JumpJets:
    case UpgradeName.Ram:
    case UpgradeName.ReverseFittedGun:
    case UpgradeName.SelfRepairProtocols:
    case UpgradeName.Transforming:
    case CompromiseName.Flammable: {
      return unit;
    }
    // Not implemented
    case UpgradeName.ReinforcedMount:
    case UpgradeName.SmokeBelcher:
    case UpgradeName.TargetingProtocols:
    case UpgradeName.TwinLinked:
    case CompromiseName.MainGunRetrofit: {
      return unit;
    }
  }
}

export function costOfAppliedModification(
  { size }: Unit,
  { modification: { name, cost }, quantity }: AppliedModification,
) {
  switch (name) {
    case UpgradeName.AAWeaponConfiguration: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 3;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.AdditionalSponsons: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 5;
        }
        default: {
          return 3;
        }
      }
    }
    case UpgradeName.EnginePowerIncrease: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 3 * quantity;
        }
        default: {
          return 1 * quantity;
        }
      }
    }
    case UpgradeName.EnhancedSensors: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 3;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.ImprovedHandling: {
      switch (size) {
        case VehicleSize.Light: {
          return 1;
        }
        case VehicleSize.Behemoth: {
          return 5;
        }
        default: {
          return 2;
        }
      }
    }
    case UpgradeName.OpticRefinement: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 5;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.CoaxialMount:
    case UpgradeName.CommunicationsModule:
    case UpgradeName.EarlyWarningRadarSystem:
    case UpgradeName.ExplosiveShielding:
    case UpgradeName.IncendiaryAmmunition:
    case UpgradeName.IndependentMovementSubroutines:
    case UpgradeName.JumpJets:
    case UpgradeName.LowProfile:
    case UpgradeName.MineClearanceEquipment:
    case UpgradeName.ReinforcedFrontArmour:
    case UpgradeName.ReinforcedSideArmour:
    case UpgradeName.ReinforcedRearArmour:
    case UpgradeName.ReverseFittedGun:
    case UpgradeName.SecondaryTurretMount:
    case UpgradeName.SelfRepairProtocols:
    case UpgradeName.ShoulderTurrets:
    case UpgradeName.SmokeBelcher:
    case UpgradeName.SpotterRelay:
    case UpgradeName.TargetingProtocols:
    case UpgradeName.ToughenedHull:
    case UpgradeName.TurretGrabber:
    case UpgradeName.UpperTurretConfiguration:
    case UpgradeName.VeteranCrew:
    case CompromiseName.EnginePowerReduction:
    case CompromiseName.Flammable:
    case CompromiseName.GreenCrew:
    case CompromiseName.LightFrontArmour:
    case CompromiseName.LightSecondaryArmour:
    case CompromiseName.LowMorale:
    case CompromiseName.MainGunRetrofit:
    case CompromiseName.PoorOptics:
    case CompromiseName.WeakHull: {
      return cost * quantity;
    }
    case UpgradeName.TailGun:
    case UpgradeName.TwinLinked: {
      switch (size) {
        case VehicleSize.Light: {
          return quantity;
        }
        default: {
          return quantity * 2;
        }
      }
    }
    case UpgradeName.RepulsorDrive: {
      switch (size) {
        case VehicleSize.Heavy: {
          return quantity * 2;
        }
        default: {
          return quantity;
        }
      }
    }
    case UpgradeName.Transforming: {
      switch (size) {
        case VehicleSize.Light: {
          return quantity * 3;
        }
        case VehicleSize.Heavy: {
          return quantity * 5;
        }
        case VehicleSize.Superheavy: {
          return quantity * 8;
        }
        default: {
          throw new Error(
            `The Transforming upgrade is invalid for the Unit's size. Unit size is ${size}`,
          );
        }
      }
    }
    case UpgradeName.ImprovedCountermeasures: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 2;
        }
        default: {
          return (quantity * (quantity + 1)) / 2;
        }
      }
    }
    case UpgradeName.Ram: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return quantity * (quantity + 1);
        }
        default: {
          return (quantity * (quantity + 1)) / 2;
        }
      }
    }
    case UpgradeName.AbominableHorror:
    case UpgradeName.Resilient: {
      // First one costs 1, second one costs 2, etc. These are called triangle numbers.
      return (quantity * (quantity + 1)) / 2;
    }
    case UpgradeName.ReinforcedMount: {
      return 0;
    }
  }
}

export function costToApplyModification(
  { size, modifications }: Unit,
  { name, cost }: ModificationShape,
) {
  const appliedModification = modifications.find(
    (m) => m.modification.name === name,
  );
  let quantity = 0;
  if (appliedModification !== undefined) {
    quantity = appliedModification.quantity;
  }

  switch (name) {
    case UpgradeName.AAWeaponConfiguration: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 3;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.AdditionalSponsons: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 5;
        }
        default: {
          return 3;
        }
      }
    }
    case UpgradeName.EnginePowerIncrease: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 3;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.EnhancedSensors: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 3;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.ImprovedHandling: {
      switch (size) {
        case VehicleSize.Light: {
          return 1;
        }
        case VehicleSize.Behemoth: {
          return 5;
        }
        default: {
          return 2;
        }
      }
    }
    case UpgradeName.OpticRefinement: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 5;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.CoaxialMount:
    case UpgradeName.CommunicationsModule:
    case UpgradeName.EarlyWarningRadarSystem:
    case UpgradeName.ExplosiveShielding:
    case UpgradeName.IncendiaryAmmunition:
    case UpgradeName.IndependentMovementSubroutines:
    case UpgradeName.JumpJets:
    case UpgradeName.LowProfile:
    case UpgradeName.MineClearanceEquipment:
    case UpgradeName.ReinforcedFrontArmour:
    case UpgradeName.ReinforcedSideArmour:
    case UpgradeName.ReinforcedRearArmour:
    case UpgradeName.ReverseFittedGun:
    case UpgradeName.SecondaryTurretMount:
    case UpgradeName.SelfRepairProtocols:
    case UpgradeName.ShoulderTurrets:
    case UpgradeName.SmokeBelcher:
    case UpgradeName.SpotterRelay:
    case UpgradeName.TargetingProtocols:
    case UpgradeName.ToughenedHull:
    case UpgradeName.TurretGrabber:
    case UpgradeName.UpperTurretConfiguration:
    case UpgradeName.VeteranCrew:
    case CompromiseName.EnginePowerReduction:
    case CompromiseName.Flammable:
    case CompromiseName.GreenCrew:
    case CompromiseName.LightFrontArmour:
    case CompromiseName.LightSecondaryArmour:
    case CompromiseName.LowMorale:
    case CompromiseName.MainGunRetrofit:
    case CompromiseName.PoorOptics:
    case CompromiseName.WeakHull: {
      return cost;
    }
    case UpgradeName.TailGun:
    case UpgradeName.TwinLinked: {
      switch (size) {
        case VehicleSize.Light: {
          return 1;
        }
        default: {
          return 2;
        }
      }
    }
    case UpgradeName.RepulsorDrive: {
      switch (size) {
        case VehicleSize.Heavy: {
          return 2;
        }
        default: {
          return 1;
        }
      }
    }
    case UpgradeName.Transforming: {
      switch (size) {
        case VehicleSize.Light: {
          return 3;
        }
        case VehicleSize.Heavy: {
          return 5;
        }
        case VehicleSize.Superheavy: {
          return 8;
        }
        default: {
          throw new Error(
            `The Transforming upgrade is invalid for the Unit's size. Unit size is ${size}`,
          );
        }
      }
    }
    case UpgradeName.ImprovedCountermeasures: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return 2;
        }
        default: {
          return quantity + 1;
        }
      }
    }
    case UpgradeName.Ram: {
      switch (size) {
        case VehicleSize.Behemoth: {
          return (quantity + 1) * 2;
        }
        default: {
          return quantity + 1;
        }
      }
    }
    case UpgradeName.AbominableHorror:
    case UpgradeName.Resilient: {
      // First one costs 1, second one costs 2, etc.
      return quantity + 1;
    }
    case UpgradeName.ReinforcedMount: {
      return 0;
    }
  }
}

function maxAllowedForModification(
  unit: Unit,
  modification: ModificationShape,
) {
  switch (modification.name) {
    case UpgradeName.AAWeaponConfiguration:
    case UpgradeName.AdditionalSponsons:
    case UpgradeName.CoaxialMount:
    case UpgradeName.EarlyWarningRadarSystem:
    case UpgradeName.CommunicationsModule:
    case UpgradeName.EnhancedSensors:
    case UpgradeName.ExplosiveShielding:
    case UpgradeName.ImprovedHandling:
    case UpgradeName.IncendiaryAmmunition:
    case UpgradeName.IndependentMovementSubroutines:
    case UpgradeName.JumpJets:
    case UpgradeName.LowProfile:
    case UpgradeName.MineClearanceEquipment:
    case UpgradeName.OpticRefinement:
    case UpgradeName.ReinforcedFrontArmour:
    case UpgradeName.ReinforcedMount:
    case UpgradeName.RepulsorDrive:
    case UpgradeName.ReverseFittedGun:
    case UpgradeName.SecondaryTurretMount:
    case UpgradeName.SelfRepairProtocols:
    case UpgradeName.ShoulderTurrets:
    case UpgradeName.SmokeBelcher:
    case UpgradeName.SpotterRelay:
    case UpgradeName.TailGun:
    case UpgradeName.TargetingProtocols:
    case UpgradeName.Transforming:
    case UpgradeName.TurretGrabber:
    case UpgradeName.UpperTurretConfiguration:
    case UpgradeName.VeteranCrew:
    case CompromiseName.Flammable:
    case CompromiseName.GreenCrew:
    case CompromiseName.LightFrontArmour:
    case CompromiseName.LightSecondaryArmour:
    case CompromiseName.LowMorale:
    case CompromiseName.PoorOptics:
    case CompromiseName.WeakHull: {
      return 1;
    }
    case UpgradeName.ImprovedCountermeasures:
    case UpgradeName.ToughenedHull: {
      switch (unit.size) {
        case VehicleSize.Light: {
          return 1;
        }
        case VehicleSize.Heavy: {
          return 2;
        }
        case VehicleSize.Superheavy:
        case VehicleSize.Behemoth: {
          return 3;
        }
        default: {
          throw new Error(
            `Cannot determine maxmimum allowed instances of ${modification.name}. Unrecognised vehicle size ${unit.size}`,
          );
        }
      }
    }
    case UpgradeName.AbominableHorror:
    case UpgradeName.Ram:
    case UpgradeName.Resilient: {
      return "no-limit";
    }
    case UpgradeName.EnginePowerIncrease:
    case UpgradeName.ReinforcedSideArmour:
    case UpgradeName.ReinforcedRearArmour:
    case UpgradeName.TwinLinked:
    case CompromiseName.EnginePowerReduction:
    case CompromiseName.MainGunRetrofit: {
      return "special";
    }
  }
}

export function isModValidForUnit(unit: Unit, modification: ModificationShape) {
  return (
    hasLessThanMaxInstances(unit, modification) &&
    unit.isOneOfSizes(modification.compatibleVehicleSizes) &&
    meetsSpecialRuleRequirements(unit, modification) &&
    unit.hasAtLeastOneOfMounts(modification.requiredMounts) &&
    hasNoExclusiveModifications(unit, modification) &&
    uniqueRequirementsSatisfied(unit, modification)
  );
}

function hasNoExclusiveModifications(unit: Unit, modification: ModificationShape) {
  return (
    modification.exclusiveModifications.length === 0 ||
    unit.modifications.every(
      (m) => !modification.exclusiveModifications.includes(m.modification.name),
    )
  );
}

function meetsSpecialRuleRequirements(unit: Unit, modification: ModificationShape) {
  return (
    (modification.requiredSpecialRuleGroups.length === 0 ||
      unit.special.some((s) =>
        modification.requiredSpecialRuleGroups.some((req) => s.includes(req)),
      )) &&
    (modification.excludedSpecialRuleGroups.length === 0 ||
      unit.special.every((s) =>
        modification.excludedSpecialRuleGroups.every((ex) => !s.includes(ex)),
      ))
  );
}

function hasLessThanMaxInstances(
  unit: Unit,
  modification: ModificationShape,
) {
  const appliedModification = unit.modifications.find(
    (m) => m.modification.name === modification.name,
  );
  if (appliedModification === undefined) {
    return true;
  }

  const maxAllowed = maxAllowedForModification(unit, modification);
  switch (maxAllowed) {
    case 1:
    case 2:
    case 3: {
      return appliedModification.quantity < maxAllowed;
    }
    case "no-limit":
    case "special": {
      return true;
    }
  }
}

function uniqueRequirementsSatisfied(unit: Unit, modification: ModificationShape) {
  switch (modification.name) {
    case UpgradeName.EnginePowerIncrease: {
      return (
        (unit.size === VehicleSize.Behemoth && unit.movement < 8) ||
        unit.movement < Math.min(12, unit.vehicleClass.movement * 2)
      );
    }
    case UpgradeName.ReinforcedSideArmour: {
      return (
        unit.armour.sides !== null && unit.armour.sides < unit.armour.front
      );
    }
    case UpgradeName.ReinforcedRearArmour: {
      return unit.armour.rear !== null && unit.armour.rear < unit.armour.front;
    }
    case UpgradeName.TargetingProtocols: {
      const incompatibleWeaponSpecialRules = ["Close Combat", "Close Action"];
      return unit.mounts.mounts.some((m) => {
        if (m.weapon === null) {
          return false;
        }
        return m.weapon.special.every((s) =>
          incompatibleWeaponSpecialRules.every((r) => !s.includes(r)),
        );
      });
    }
    case UpgradeName.TwinLinked: {
      const incompatibleWeaponSpecialRules = ["Close Combat", "Bomb", "Burst"];
      return unit.mounts.mounts.some((m) => {
        if (m.weapon === null) {
          return false;
        }
        return m.weapon.special.every((s) =>
          incompatibleWeaponSpecialRules.every((r) => !s.includes(r)),
        );
      });
    }
    case CompromiseName.EnginePowerReduction: {
      return unit.movement > 2;
    }
    case CompromiseName.LightFrontArmour: {
      return (
        unit.armour.front >
        Math.max(unit.armour.sides || 0, unit.armour.rear || 0)
      );
    }
    case CompromiseName.WeakHull: {
      return unit.hullPoints > 2;
    }
    default:
      return true;
  }
}
