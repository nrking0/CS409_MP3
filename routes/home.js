const User = require("../models/user");
const Task = require("../models/task");

const query = (Model, opts = {}) => {
    const where = opts.where;
    let q = Model.find(where);

    if (opts.count) {
        if (opts.limit != null) {
            q = q.limit(parseInt(opts.limit));
        }

        if (opts.skip != null) {
            q = q.skip(parseInt(opts.skip));
        }

        return q.exec().then((res) => res.length);
    }

    if (opts.limit != null) {
        q = q.limit(parseInt(opts.limit));
    }

    if (opts.skip != null) {
        q = q.skip(parseInt(opts.skip));
    }

    if (opts.sort) {
        q = q.sort(opts.sort);
    }

    if (opts.select) {
        q = q.select(opts.select);
    }

    return q.exec();
};

module.exports = function (router) {
    var homeRoute = router.route("/");

    homeRoute.get(function (req, res) {
        // var connectionString = process.env.TOKEN;
        res.json({ message: "Hello World!" });
    });

    router.get("/users", async (req, res) => {
        const opts = {
            where: req.query.where ? JSON.parse(req.query.where) : {},
            limit: req.query.limit,
            skip: req.query.skip,
            sort: req.query.sort ? JSON.parse(req.query.sort) : null,
            select: req.query.select ? JSON.parse(req.query.select) : null,
            count: req.query.count === "true",
        };

        try {
            const result = await query(User, opts);
            return res.status(200).json({ message: "OK", data: result });
        } catch (err) {
            console.error(err);
            return res
                .status(500)
                .json({ message: "ERR", data: "Error fetching users!" });
        }
    });

    router.post("/users", (req, res) => {
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: "ERR",
                data: "User name and email are required!",
            });
        }

        const newUser = new User();
        newUser.name = req.body.name;
        newUser.email = req.body.email;
        newUser.pendingTasks = [];
        newUser.dateCreated = Date.now();

        newUser.save((err, user) => {
            if (err) {
                res.status(500).json({
                    message: "ERR",
                    data: "Error creating user!",
                });
            } else {
                res.status(201).json({ message: "OK", data: user });
            }
        });
    });

    router.get("/users/:userId", (req, res) => {
        if (req.query.select) {
            const select = JSON.parse(req.query.select);
            User.findById(req.params.userId)
                .select(select)
                .exec((err, user) => {
                    if (err)
                        return res.status(500).json({
                            message: "ERR",
                            data: "Error fetching user!",
                        });
                    if (!user)
                        return res
                            .status(404)
                            .json({ message: "ERR", data: "User not found!" });
                    return res.status(200).json({ message: "OK", data: user });
                });
        } else {
            User.findById(req.params.userId).exec((err, user) => {
                if (err) {
                    res.status(500).json({
                        message: "ERR",
                        data: "Error fetching user!",
                    });
                } else if (!user) {
                    res.status(404).json({
                        message: "ERR",
                        data: "User not found!",
                    });
                } else {
                    res.status(200).json({ message: "OK", data: user });
                }
            });
        }
    });

    router.delete("/users/:userId", (req, res) => {
        Task.updateMany(
            { assignedUser: req.params.userId },
            { $set: { assignedUser: "", assignedUserName: "unassigned" } },
            (err) => {
                if (err) {
                    return res.status(500).json({
                        message: "ERR",
                        data: "Error unassigning tasks!",
                    });
                }
                User.findByIdAndDelete(req.params.userId, (e2, deletedUser) => {
                    if (e2) {
                        return res.status(500).json({
                            message: "ERR",
                            data: "Error deleting user!",
                        });
                    } else if (!deletedUser) {
                        return res
                            .status(404)
                            .json({ message: "ERR", data: "User not found!" });
                    } else {
                        return res.status(204).send();
                    }
                });
            }
        );
    });

    router.put("/users/:userId", (req, res) => {
        if (!req.body.name || !req.body.email) {
            return res.status(400).json({
                message: "ERR",
                data: "User name and email are required!",
            });
        }
        User.findById(req.params.userId, (err, user) => {
            if (err) {
                res.status(500).json({
                    message: "ERR",
                    data: "Error fetching user!",
                });
            } else if (!user) {
                res.status(404).json({
                    message: "ERR",
                    data: "User not found!",
                });
            } else {
                user.name = req.body.name || user.name;
                user.email = req.body.email || user.email;
                user.pendingTasks = req.body.pendingTasks || user.pendingTasks;

                user.save((e2, updatedUser) => {
                    if (e2) {
                        res.status(500).json({
                            message: "ERR",
                            data: "Error updating user!",
                        });
                    } else {
                        user.pendingTasks.map((taskId) => {
                            Task.findByIdAndUpdate(
                                taskId,
                                {
                                    assignedUser: user._id,
                                    assignedUserName: user.name,
                                },
                                (err) => {
                                    if (err) {
                                        res.status(500).json({
                                            message: "ERR",
                                            data: "Error updating task!",
                                        });
                                    }
                                }
                            );
                        });
                        res.status(200).json({
                            message: "OK",
                            data: updatedUser,
                        });
                    }
                });
            }
        });
    });

    router.get("/tasks", async (req, res) => {
        const opts = {
            where: req.query.where ? JSON.parse(req.query.where) : {},
            limit: req.query.limit,
            skip: req.query.skip,
            sort: req.query.sort ? JSON.parse(req.query.sort) : null,
            select: req.query.select ? JSON.parse(req.query.select) : null,
            count: req.query.count === "true",
        };

        try {
            const result = await query(Task, opts);
            return res.status(200).json({ message: "OK", data: result });
        } catch (err) {
            return res
                .status(500)
                .json({ message: "ERR", data: "Error fetching tasks!" });
        }
    });

    router.post("/tasks", (req, res) => {
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: "ERR",
                data: "Task name and deadline are required!",
            });
        }

        const newTask = new Task();
        newTask.name = req.body.name;
        newTask.description = req.body.description || "";
        newTask.deadline = req.body.deadline;
        newTask.completed = req.body.completed || false;
        newTask.assignedUser = req.body.assignedUser || "";
        newTask.assignedUserName = req.body.assignedUserName || "unassigned";
        newTask.dateCreated = Date.now();

        newTask.save((err, task) => {
            if (err) {
                res.status(500).json({
                    message: "ERR",
                    data: "Error creating task!",
                });
            } else {
                res.status(201).json({ message: "OK", data: task });
            }
        });
    });

    router.get("/tasks/:taskId", (req, res) => {
        if (req.query.select) {
            const select = JSON.parse(req.query.select);
            Task.findById(req.params.taskId)
                .select(select)
                .exec((err, task) => {
                    if (err)
                        return res.status(500).json({
                            message: "ERR",
                            data: "Error fetching task!",
                        });
                    if (!task)
                        return res
                            .status(404)
                            .json({ message: "ERR", data: "Task not found!" });
                    return res.status(200).json({ message: "OK", data: task });
                });
        } else {
            Task.findById(req.params.taskId, (err, task) => {
                if (err) {
                    res.status(500).json({
                        message: "ERR",
                        data: "Error fetching task!",
                    });
                } else if (!task) {
                    res.status(404).json({
                        message: "ERR",
                        data: "Task not found!",
                    });
                } else {
                    res.status(200).json({ message: "OK", data: task });
                }
            });
        }
    });

    router.put("/tasks/:taskId", (req, res) => {
        if (!req.body.name || !req.body.deadline) {
            return res.status(400).json({
                message: "ERR",
                data: "Task name and deadline are required!",
            });
        }

        Task.findById(req.params.taskId, (err, task) => {
            if (err) {
                res.status(500).json({
                    message: "ERR",
                    data: "Error fetching task!",
                });
            } else if (!task) {
                res.status(404).json({
                    message: "ERR",
                    data: "Task not found!",
                });
            } else {
                const oldUserId = task.assignedUser;
                task.name = req.body.name || task.name;
                task.description = req.body.description || task.description;
                task.deadline = req.body.deadline || task.deadline;
                task.completed =
                    req.body.completed != null
                        ? req.body.completed
                        : task.completed;
                task.assignedUser = req.body.assignedUser || task.assignedUser;
                task.assignedUserName =
                    req.body.assignedUserName || task.assignedUserName;

                task.save((e2, updatedTask) => {
                    if (e2) {
                        res.status(500).json({
                            message: "ERR",
                            data: "Error updating task!",
                        });
                    } else {
                        if (oldUserId !== task.assignedUser) {
                            if (oldUserId !== "") {
                                User.findById(oldUserId, (e, oldUser) => {
                                    if (e) {
                                        res.status(500).json({
                                            message: "ERR",
                                            data: "Error fetching user!",
                                        });
                                    } else if (oldUser) {
                                        oldUser.pendingTasks =
                                            oldUser.pendingTasks.filter(
                                                (tid) =>
                                                    tid !== req.params.taskId
                                            );
                                        oldUser.save((e2) => {
                                            if (e2) {
                                                res.status(500).json({
                                                    message: "ERR",
                                                    data: "Error updating user!",
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                            if (task.assignedUser !== "") {
                                User.findById(
                                    task.assignedUser,
                                    (e, newUser) => {
                                        if (e) {
                                            res.status(500).json({
                                                message: "ERR",
                                                data: "Error fetching user!",
                                            });
                                        } else if (newUser) {
                                            if (
                                                !newUser.pendingTasks.includes(
                                                    req.params.taskId
                                                )
                                            ) {
                                                newUser.pendingTasks.push(
                                                    req.params.taskId
                                                );
                                                newUser.save((e2) => {
                                                    if (e2) {
                                                        res.status(500).json({
                                                            message: "ERR",
                                                            data: "Error updating user!",
                                                        });
                                                    }
                                                });
                                            }
                                        }
                                    }
                                );
                            }
                        }
                        res.status(200).json({
                            message: "OK",
                            data: updatedTask,
                        });
                    }
                });
            }
        });
    });

    router.delete("/tasks/:taskId", (req, res) => {
        Task.findByIdAndDelete(req.params.taskId, (err, deletedTask) => {
            if (err) {
                res.status(500).json({
                    message: "ERR",
                    data: "Error deleting task!",
                });
            } else if (!deletedTask) {
                res.status(404).json({
                    message: "ERR",
                    data: "Task not found!",
                });
            } else {
                if (deletedTask.assignedUser) {
                    User.findById(deletedTask.assignedUser, (e, user) => {
                        if (e) {
                            res.status(500).json({
                                message: "ERR",
                                data: "Error fetching user!",
                            });
                        } else if (user) {
                            user.pendingTasks = user.pendingTasks.filter(
                                (tid) => tid !== req.params.taskId
                            );
                            user.save((e2) => {
                                if (e2) {
                                    res.status(500).json({
                                        message: "ERR",
                                        data: "Error updating user!",
                                    });
                                }
                            });
                        }
                    });
                }
                res.status(204).send();
            }
        });
    });

    return router;
};
