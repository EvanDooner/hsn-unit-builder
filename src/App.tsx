import { useCallback, useReducer } from 'react'
import './App.css'
import VehicleClass, { LightBattleVehicle, VehicleClasses } from './models/vehicle-class';
import Unit from './models/unit';
import { Mount } from './models/mount';
import Weapon from './models/weapon';
import { WeaponTypes } from './models/weapon-class';

interface UnitCardProps {
  unit: Unit,
  handleWeaponChange: React.ChangeEventHandler<HTMLSelectElement>
}

interface VehicleClassSelectProps {
  vehicleClass: VehicleClass,
  handleVehicleClassChange: React.ChangeEventHandler<HTMLSelectElement>
}

interface UnitFormState {
  clean: boolean,
  vehicleClass: VehicleClass,
  unit:  Unit
}

type UnitFormAction = 
  | {type: "classChanged", vehicleClass: string}
  | {type: "weaponChanged", mountKey: string, weaponType: string}

const initialState: UnitFormState = {
  clean: true,
  vehicleClass: LightBattleVehicle,
  unit: new Unit(LightBattleVehicle)
}

interface WeaponListProps {
  mounts: Mount[],
  handleWeaponChange: React.ChangeEventHandler<HTMLSelectElement>
}

function WeaponList({mounts, handleWeaponChange}: WeaponListProps) {
  let weaponList = mounts.map((mount) => {
    if (mount.weapon !== null) {
      return (
        <li className="weapon" key={mount.key}>
          <div className="weapon value">{mount.weapon.name}</div>
          <div className="rating value">{mount.weapon.rating}</div>
          <div className="mount value">{mount.type.mountType}</div>
          <div className="special value">{mount.weapon.special}</div>
        </li>
      );
    }

    let compatibleWeapons = mount.compatibleWeaponTypes().map((w) =>
      <option value={w.name} key={w.name} >{`${w.name} (${w.cost})`}</option>
    );

    return (
      <li className="weapon" key={mount.key}>
        <div className="weapon-selector">
          <select name={mount.key} onChange={handleWeaponChange}>
            <option value="">Choose a weapon...</option>
            {compatibleWeapons}
          </select>
        </div>
        <div className="mount value">{mount.type.mountType}</div>
        <div className="special value"> </div>
      </li>
    );
  });

  return (
    <div className="weapons">
      <div className="weapon title">Weapons</div>
      <div className="rating title">Rating</div>
      <div className="mount title">Mount</div>
      <div className="special title">Special</div>
      <ul className="weapons-list">
        {weaponList}
      </ul>
    </div>
  )
}

function UnitCard({unit, handleWeaponChange}: UnitCardProps) {
  return (
    <div className="unit">
      <div className="name">{unit.name}</div>
      <div className="cost title">Cost</div>
      <div className="cost value">{unit.cost}</div>
      <div className="size title">Size</div>
      <div className="size value">{unit.size}</div>
      <div className="discipline title">Discipline</div>
      <div className="discipline value">{unit.discipline}</div>
      <div className="optics title">Optics</div>
      <div className="optics value">{unit.optics}</div>
      <div className="movement title">Movement</div>
      <div className="movement value">{unit.movement}</div>
      <div className="morale title">Morale</div>
      <div className="morale value">{unit.morale}</div>
      <div className="armour title">Armour</div>
      <div className="armour value">{unit.armour.front}/{unit.armour.sides}/{unit.armour.rear}</div>
      <div className="hullpoints title">Hull Points</div>
      <div className="hullpoints value">{unit.hullPoints}</div>
      <div className="special title">Special</div>
      <div className="special value">{unit.special}</div>
      <WeaponList mounts={unit.mounts} handleWeaponChange={handleWeaponChange}  />
      <div className="modifications">
        <div className="title">Modifications</div>
        <div className="modifications-list">
          <div className="modification">Reinforced Side Armour</div>
        </div>
      </div>
    </div>
  );
}

function VehicleClassSelect({vehicleClass, handleVehicleClassChange}: VehicleClassSelectProps) {
  let classList = VehicleClasses.map((v) =>
    <option value={v.name} key={v.name}>{v.name}</option>
  )
  return (
    <div>
      <label>
        <select name="vehicle-class" id="vehicle-class" value={vehicleClass.name} onChange={handleVehicleClassChange}>
          {classList}
        </select>
      </label>
      <div>Base Cost: {vehicleClass.baseCost}</div>
      <div>Max Cost: {vehicleClass.maxCost}</div>
    </div>
  )
}

function App() {
  const [unitForm, dispatch] = useReducer(unitReducer, initialState)

  const handleVehicleClassChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>((e) => {
    dispatch({
      type: 'classChanged',
      vehicleClass: e.target.value
    });
  }, [dispatch]);

  const handleWeaponChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>((e) => {
    dispatch({
      type: 'weaponChanged',
      mountKey: e.target.name,
      weaponType: e.target.value
    });
  }, [dispatch]);

  function unitReducer(unitForm: UnitFormState, action: UnitFormAction): UnitFormState {
    switch (action.type) {
      case 'classChanged': {
        let vehicleClass = VehicleClasses.find(vc => vc.name === action.vehicleClass);
        if (!vehicleClass) {
          throw Error('Unknow vehicle class: ' + action.vehicleClass);
        }
        return {
          clean: true,
          vehicleClass: vehicleClass,
          unit: new Unit(vehicleClass)
        };
      }
      case 'weaponChanged': {
        let unit = unitForm.unit;
        let {mountKey, weaponType} = action;
        let mountToEquip = unit.mounts.find((m) => m.key === mountKey)
        if (!mountToEquip) {
          throw Error('Unknow mount type: ' + mountKey);
        }

        let weaponToEquip = WeaponTypes.find((w) => weaponType === w.name)
        if (!weaponToEquip) {
          throw Error('Unknow weapon type: ' + weaponType);
        }

        mountToEquip.setWeapon(new Weapon(weaponToEquip, mountToEquip.type.mountType));

        return {
          ...unitForm,
          clean: false,
          unit: unit
        };
      }
    }
  }

  let classList = VehicleClasses.map((v) =>
    <option value={v.name} key={v.name}>{v.name}</option>
  )

  let {vehicleClass, unit} = unitForm;

  return (
    <>
      <VehicleClassSelect vehicleClass={vehicleClass} handleVehicleClassChange={handleVehicleClassChange} />
      <UnitCard unit={unit} handleWeaponChange={handleWeaponChange} />
    </>
  )
}

export default App