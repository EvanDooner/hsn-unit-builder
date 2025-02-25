import { ModificationType, VehicleSize, UpgradeName } from "../../constants";
import Unit from "../../unit";
import { Modification } from "../modifications";

class EarlyWarningRadarSystemUpgrade extends Modification {
  type =  ModificationType.Upgrade;
  name =  UpgradeName.EarlyWarningRadarSystem;
  cost =  2;
  compatibleVehicleSizes =  [
    VehicleSize.Light,
    VehicleSize.Heavy,
    VehicleSize.Superheavy,
  ];
  maxAllowed =  1;
  requiredSpecialRuleGroups =  [];
  excludedSpecialRuleGroups =  ["Flyer"];
  requiredMounts =  [];
  exclusiveModifications =  [];

  applyModificationToUnit(unit: Unit): Unit {
    // No stat changes to apply (more or less)
    return unit;
  }

  costOfAppliedModification(_unit: Unit, quantity: number): number {
    return this.cost * quantity;
  }

  costToApplyModification(): number {
    return this.cost;
  }

  maxAllowedForModification(): 1 | 2 | 3 | "no-limit" | "special" {
    return 1;
  }

  uniqueRequirementsSatisfied(): boolean {
    return true;
  }
}

const EarlyWarningRadarSystem = new EarlyWarningRadarSystemUpgrade();

export default EarlyWarningRadarSystem;