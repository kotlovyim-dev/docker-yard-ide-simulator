import { describe, it, expect } from "vitest";
import { parseCommand } from "../engine/parser";

describe("parseCommand", () => {
    it("parses simplistic command", () => {
        expect(parseCommand("docker")).toEqual({
            raw: "docker",
            command: "docker",
            subcommand: null,
            args: [],
            flags: {},
        });
    });

    it("parses command with subcommand", () => {
        expect(parseCommand("docker run nginx")).toEqual({
            raw: "docker run nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: {},
        });
    });

    it("parses command with double subcommand", () => {
        expect(parseCommand("docker compose up")).toEqual({
            raw: "docker compose up",
            command: "docker",
            subcommand: "compose up",
            args: [],
            flags: {},
        });
    });

    it("parses short flags (boolean)", () => {
        expect(parseCommand("docker run -d nginx")).toEqual({
            raw: "docker run -d nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { d: true },
        });
    });

    it("parses long flags (boolean)", () => {
        expect(parseCommand("docker run --detach nginx")).toEqual({
            raw: "docker run --detach nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { detach: true },
        });
    });

    it("parses short flags with value", () => {
        expect(parseCommand("docker run -p 8080:80 nginx")).toEqual({
            raw: "docker run -p 8080:80 nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { p: "8080:80" },
        });
    });

    it("parses combined short flags", () => {
        expect(parseCommand("docker run -it nginx")).toEqual({
            raw: "docker run -it nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { i: true, t: true },
        });
    });

    it("parses long flags with value (space separated)", () => {
        expect(parseCommand("docker run --name my-container nginx")).toEqual({
            raw: "docker run --name my-container nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { name: "my-container" },
        });
    });

    it("parses long flags with value (equals separated)", () => {
        expect(parseCommand("docker run --name=my-container nginx")).toEqual({
            raw: "docker run --name=my-container nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { name: "my-container" },
        });
    });

    it("parses mixed flags and args", () => {
        expect(parseCommand("docker run -d -p 80:80 --name web nginx")).toEqual({
            raw: "docker run -d -p 80:80 --name web nginx",
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { d: true, p: "80:80", name: "web" },
        });
    });

    it("handles quoted arguments with spaces", () => {
        expect(parseCommand('docker run -e "MSG=hello world" nginx')).toEqual({
            raw: 'docker run -e "MSG=hello world" nginx',
            command: "docker",
            subcommand: "run",
            args: ["nginx"],
            flags: { e: "MSG=hello world" },
        });
    });

    it("handles multiple args", () => {
        expect(parseCommand("docker exec -it my-container bash -c 'ls -la'")).toEqual({
            raw: "docker exec -it my-container bash -c 'ls -la'",
            command: "docker",
            subcommand: "exec",
            args: ["my-container", "bash", "-c", "ls -la"],
            flags: { i: true, t: true },
        });
    });

    it("strips leading whitespace", () => {
        expect(parseCommand("  docker ps ")).toEqual({
            raw: "  docker ps ",
            command: "docker",
            subcommand: "ps",
            args: [],
            flags: {},
        });
    });

    it("handles empty input", () => {
        expect(parseCommand("")).toEqual({
            raw: "",
            command: "",
            subcommand: null,
            args: [],
            flags: {},
        });
    });

    it("handles unknown commands gracefully", () => {
        expect(parseCommand("kubectl get pods")).toEqual({
            raw: "kubectl get pods",
            command: "kubectl",
            subcommand: null,
            args: ["get", "pods"],
            flags: {},
        });
    });
});
