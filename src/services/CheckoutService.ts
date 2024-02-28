import { Customer, Order, PrismaClient } from "@prisma/client";

import { SnackData } from "../interfaces/SnackData";
import { CustomerData } from "../interfaces/CustomerData";
import { PaymentData } from "../interfaces/PaymentData";
import PaymentService from "./PaymentService";

export default class CheckoutService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async process(
    cart: SnackData[],
    customer: CustomerData,
    payment: PaymentData
  ): Promise<{ id: number; transactionId: string; status: string }> {
    const snacks = await this.prisma.snack.findMany({
      where: {
        id: {
          in: cart.map((snack) => snack.id),
        },
      },
    });

    const snacksInCart = snacks.map<SnackData>((snack) => ({
      ...snack,
      price: Number(snack.price),
      quantity: cart.find((item) => item.id == snack.id)?.quantity!,
      subTotal:
        cart.find((item) => item.id == snack.id)?.quantity! *
        Number(snack.price),
    }));

    const customerCreated = await this.createCustomer(customer);

    let orderCreated = await this.createOrder(snacksInCart, customerCreated);

    const { transactionId, status } = await new PaymentService().process(
      orderCreated,
      customerCreated,
      payment
    );

    orderCreated = await this.prisma.order.update({
      where: { id: orderCreated.id },
      data: {
        transactionId: transactionId,
        status: status,
      },
    });

    return {
      id: orderCreated.id,
      transactionId: orderCreated.transactionId!,
      status: orderCreated.status,
    };
  }

  private async createCustomer(customer: CustomerData): Promise<Customer> {
    const customerCreated = await this.prisma.customer.upsert({
      where: { email: customer.email },
      update: customer,
      create: customer,
    });
    return customerCreated;
  }

  private async createOrder(
    snacksInCart: SnackData[],
    customer: Customer
  ): Promise<Order> {
    const total = snacksInCart.reduce(
      (total, snack) => total + snack.subTotal,
      0
    );

    const orderCreated = await this.prisma.order.create({
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
  }
}
