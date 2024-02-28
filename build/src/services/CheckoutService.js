"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const PaymentService_1 = __importDefault(require("./PaymentService"));
class CheckoutService {
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    process(cart, customer, payment) {
        return __awaiter(this, void 0, void 0, function* () {
            const snacks = yield this.prisma.snack.findMany({
                where: {
                    id: {
                        in: cart.map((snack) => snack.id),
                    },
                },
            });
            const snacksInCart = snacks.map((snack) => {
                var _a, _b;
                return (Object.assign(Object.assign({}, snack), { price: Number(snack.price), quantity: (_a = cart.find((item) => item.id == snack.id)) === null || _a === void 0 ? void 0 : _a.quantity, subTotal: ((_b = cart.find((item) => item.id == snack.id)) === null || _b === void 0 ? void 0 : _b.quantity) *
                        Number(snack.price) }));
            });
            const customerCreated = yield this.createCustomer(customer);
            let orderCreated = yield this.createOrder(snacksInCart, customerCreated);
            const { transactionId, status } = yield new PaymentService_1.default().process(orderCreated, customerCreated, payment);
            orderCreated = yield this.prisma.order.update({
                where: { id: orderCreated.id },
                data: {
                    transactionId: transactionId,
                    status: status,
                },
            });
            return {
                id: orderCreated.id,
                transactionId: orderCreated.transactionId,
                status: orderCreated.status,
            };
        });
    }
    createCustomer(customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const customerCreated = yield this.prisma.customer.upsert({
                where: { email: customer.email },
                update: customer,
                create: customer,
            });
            return customerCreated;
        });
    }
    createOrder(snacksInCart, customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const total = snacksInCart.reduce((total, snack) => total + snack.subTotal, 0);
            const orderCreated = yield this.prisma.order.create({
                data: {
                    total,
                    customer: {
                        connect: { id: customer.id },
                    },
                    orderItems: {
                        createMany: {
                            data: snacksInCart.map((snack) => ({
                                snackId: snack.id,
                                quantity: snack.quantity,
                                subTotal: snack.subTotal,
                            })),
                        },
                    },
                },
                include: {
                    customer: true,
                    orderItems: {
                        include: {
                            snack: true,
                        },
                    },
                },
            });
            return orderCreated;
        });
    }
}
exports.default = CheckoutService;
