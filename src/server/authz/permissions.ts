export type Role = "OWNER"|"MANAGER"|"OPERATOR"|"VETERINARIAN"|"READER";
export type Action = "view"|"editAnimals"|"deleteAnimals"|"weigh"|"sales"|"importAnimals"|"importSales"|"rollbackImport"|"manageUsers"|"farmSettings"|"createFarms"|"audit";
export const permissions: Record<Action,Role[]> = {
  view:["OWNER","MANAGER","OPERATOR","VETERINARIAN","READER"], editAnimals:["OWNER","MANAGER","OPERATOR"], deleteAnimals:["OWNER","MANAGER"], weigh:["OWNER","MANAGER","OPERATOR","VETERINARIAN"], sales:["OWNER","MANAGER"], importAnimals:["OWNER","MANAGER","OPERATOR"], importSales:["OWNER","MANAGER"], rollbackImport:["OWNER","MANAGER"], manageUsers:["OWNER","MANAGER"], farmSettings:["OWNER","MANAGER"], createFarms:["OWNER"], audit:["OWNER","MANAGER"]
};
export const can = (role:Role, action:Action) => permissions[action].includes(role);
